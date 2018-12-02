import { setItemState as d1SetItemState } from '../bungie-api/destiny1-api';
import { setLockState as d2SetLockState } from '../bungie-api/destiny2-api';
import { settings } from '../settings/settings';
import { IController, IScope, IComponentOptions, IAngularEvent } from 'angular';
import template from './dimMoveItemProperties.html';
import { DimItem, D2Item } from '../inventory/item-types';
import { dimDestinyTrackerService } from '../item-review/destiny-tracker.service';
import { $q } from 'ngimport';
import { router } from '../../router';
import { DestinyInventoryItemDefinition } from 'bungie-api-ts/destiny2';
import { hotkeys } from '../ngimport-more';
import { t } from 'i18next';
import { CompareService } from '../compare/compare.service';
import { dimCuratedRollService } from '../curated-rolls/curatedRollService';

export const MoveItemPropertiesComponent: IComponentOptions = {
  controller: MoveItemPropertiesCtrl,
  controllerAs: 'vm',
  bindings: {
    item: '<',
    compareItem: '<',
    infuse: '&',
    failureStrings: '<',
    rewards: '<'
  },
  template
};

function MoveItemPropertiesCtrl(
  this: IController & {
    item: DimItem;
    compareItem?: DimItem;
    failureStrings?: string[];
    rewards?: {
      quantity: number;
      item: DestinyInventoryItemDefinition;
    }[];
    settings: typeof settings;
    infuse(item: DimItem, $event: IAngularEvent): void;
  },
  ngDialog,
  $scope: IScope
) {
  'ngInject';
  const vm = this;

  vm.tab = 'default';
  vm.locking = false;
  vm.classes = {
    'is-Common': false,
    'is-Uncommon': false,
    'is-Rare': false,
    'is-Legendary': false,
    'is-Exotic': false
  };
  vm.light = null;
  $scope.$watch(
    () => settings,
    () => {
      vm.settings = settings;
    }
  );

  /**
   * Banshee-44 puts placeholder entries in for the still-mysterious socketTypeHash 0.
   * If you look at Scathelocke https://data.destinysets.com/i/InventoryItem:3762467078
   * for one example, socketEntires[5] has a socketTypeHash of 0. We discard this
   * (and other sockets), as we build our definition of sockets we care about, so
   * I look for gaps in the index and drop a zero in where I see them.
   */
  function buildBansheeLink(item: D2Item): string {
    const perkValues: number[] = [];

    item.sockets!.sockets.forEach((socket, socketIndex) => {
      if (socketIndex > 0) {
        const currentSocketPosition = socket.socketIndex;
        const priorSocketPosition = item.sockets!.sockets[socketIndex - 1].socketIndex;

        if (currentSocketPosition > priorSocketPosition + 1) {
          perkValues.push(0);
        }
      }

      if (socket.plug) {
        perkValues.push(socket.plug.plugItem.hash);
      }
    });

    return perkValues.join(',');
  }

  vm.$onInit = () => {
    const item = vm.item;
    vm.hasDetails = Boolean(
      (item.stats && item.stats.length) ||
        item.talentGrid ||
        item.objectives ||
        (item.isDestiny2() && item.flavorObjective) ||
        item.secondaryIcon
    );
    vm.showDescription = Boolean(item.description && item.description.length);
    vm.showDetailsByDefault = !item.equipment && item.notransfer;
    vm.itemDetails = vm.showDetailsByDefault;

    dimDestinyTrackerService.getItemReviews(vm.item).then(() => $scope.$apply());

    vm.curationEnabled = dimCuratedRollService.curationEnabled;
    vm.inventoryCuratedRoll = dimCuratedRollService.getInventoryCuratedRoll(item);

    // DTR 404s on the new D2 languages for D1 items
    let language = settings.language;
    if (vm.item.destinyVersion === 1) {
      switch (language) {
        case 'es-mx':
          language = 'es';
          break;
        case 'pl':
        case 'ru':
        case 'zh-cht':
        case 'zh-chs':
          language = 'en';
          break;
      }
    } else {
      // For D2, DTR uses English for es-mx
      switch (language) {
        case 'es-mx':
          language = 'es';
          break;
      }
    }
    vm.destinyDBLink = `http://db.destinytracker.com/d${vm.item.destinyVersion}/${
      settings.language
    }/items/${vm.item.hash}`;

    if (
      vm.item.isDestiny2() &&
      vm.item.primStat &&
      vm.item.primStat.statHash === 1480404414 && // weapon
      vm.item.sockets &&
      vm.item.sockets.sockets
    ) {
      vm.banshee44Link = `https://banshee-44.com/?weapon=${
        vm.item.hash
      }&socketEntries=${buildBansheeLink(vm.item)}`;
    }

    if (vm.item.primStat) {
      vm.light = vm.item.primStat.value.toString();
    }
    if (vm.item.tier) {
      vm.classes[`is-${vm.item.tier}`] = true;
    }

    if (
      vm.item.classTypeName !== 'unknown' &&
      // These already include the class name
      vm.item.type !== 'ClassItem' &&
      vm.item.type !== 'Artifact' &&
      vm.item.type !== 'Class'
    ) {
      vm.classType =
        vm.item.classTypeNameLocalized[0].toUpperCase() + vm.item.classTypeNameLocalized.slice(1);
    }

    /*
     * Get the item stats and its stat name
     * of the equipped item for comparison
     */
    if (vm.item.equipment) {
      if (vm.compareItem) {
        $scope.$watch('vm.compareItem', compareItems);
      } else {
        $scope.$watch('$parent.$parent.vm.store.items', (items: DimItem[]) => {
          const item = (items || []).find((item) => item.equipped && item.type === vm.item.type);
          compareItems(item);
        });
      }
    }
  };

  const hot = hotkeys.bindTo($scope);

  // The 'i' keyboard shortcut toggles full details
  hot.add({
    combo: ['i'],
    description: t('Hotkey.ToggleDetails'),
    callback() {
      vm.itemDetails = !vm.itemDetails;
    }
  });

  $scope.$watch('vm.itemDetails', (newValue, oldValue) => {
    if (newValue !== oldValue) {
      $scope.$emit('popup-size-changed');
    }
  });

  vm.openCompare = () => {
    ngDialog.closeAll();
    CompareService.addItemToCompare(vm.item, true);
  };

  vm.updateNote = () => {
    if (vm.item.dimInfo.notes === '') {
      delete vm.item.dimInfo.notes;
    }
    vm.item.dimInfo.save!();
  };

  vm.setItemState = function setItemState(item: DimItem, type: 'lock' | 'track') {
    if (vm.locking) {
      return;
    }

    const store =
      item.owner === 'vault'
        ? item.getStoresService().getActiveStore()!
        : item.getStoresService().getStore(item.owner)!;

    vm.locking = true;

    let state = false;
    if (type === 'lock') {
      state = !item.locked;
    } else if (type === 'track') {
      state = !item.tracked;
    }

    if (item.isDestiny2()) {
      $q.when(d2SetLockState(store, item, state))
        .then(() => {
          // TODO: this doesn't work in React land
          item.locked = state;
        })
        .finally(() => {
          vm.locking = false;
        });
    } else if (item.isDestiny1()) {
      $q.when(d1SetItemState(item, store, state, type))
        .then(() => {
          if (type === 'lock') {
            item.locked = state;
          } else if (type === 'track') {
            item.tracked = state;
          }
        })
        .finally(() => {
          vm.locking = false;
        });
    }
  };

  vm.previewVendor = () => {
    const item = vm.item;
    if (item.isDestiny2()) {
      router.stateService.go('destiny2.vendor', { id: item.previewVendor });
    }
  };

  $scope.$watch('vm.settings.itemDetails', (show) => {
    vm.itemDetails = vm.itemDetails || show;
  });

  function compareItems(item?: DimItem) {
    if (item && vm.item.stats) {
      for (const key in Object.getOwnPropertyNames(vm.item.stats)) {
        const itemStats = item.stats && item.stats[key];
        if (itemStats) {
          const vmItemStats: any = vm.item.stats[key];
          if (vmItemStats) {
            vmItemStats.equippedStatsValue = itemStats.value;
            vmItemStats.equippedStatsName = itemStats.name;
            vmItemStats.comparable =
              vmItemStats.equippedStatsName === vmItemStats.name ||
              (vmItemStats.name === 'Magazine' && vmItemStats.equippedStatsName === 'Energy') ||
              (vmItemStats.name === 'Energy' && vmItemStats.equippedStatsName === 'Magazine');
          }
        }
      }
    }
  }
}
