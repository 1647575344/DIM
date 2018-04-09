import { StateParams } from '@uirouter/angularjs';
import { IScope } from 'angular';
import { DestinyVendorDefinition, DestinyVendorResponse } from 'bungie-api-ts/destiny2';
import * as React from 'react';
import { DestinyAccount } from '../accounts/destiny-account.service';
import { getVendor as getVendorApi } from '../bungie-api/destiny2-api';
import { D2ManifestDefinitions, getDefinitions } from '../destiny2/d2-definitions.service';
import { BungieImage } from '../dim-ui/bungie-image';
import Countdown from '../dim-ui/countdown';
import { StoreServiceType } from '../inventory/d2-stores.service';
import { D2ManifestService } from '../manifest/manifest-service';
import { FactionIcon } from '../progress/faction';
import VendorItems from './vendor-items';
import './vendor.scss';
import { fetchRatingsForVendor, fetchRatingsForVendorDef } from './vendor-ratings';
import { DestinyTrackerServiceType } from '../item-review/destiny-tracker.service';
import { Subscription } from 'rxjs/Subscription';
import { DimStore } from '../inventory/store/d2-store-factory.service';

interface Props {
  $scope: IScope;
  $stateParams: StateParams;
  account: DestinyAccount;
  D2StoresService: StoreServiceType;
  dimDestinyTrackerService: DestinyTrackerServiceType;
}

interface State {
  vendorHash: number;
  stores?: DimStore[];
  ownedItemHashes?: Set<number>;
  defs?: D2ManifestDefinitions;
  vendorDef?: DestinyVendorDefinition;
  vendorResponse?: DestinyVendorResponse;
  trackerService?: DestinyTrackerServiceType;
}

export default class SingleVendor extends React.Component<Props, State> {
  private storesSubscription: Subscription;

  constructor(props: Props) {
    super(props);
    this.state = {
      vendorHash: this.props.$stateParams.id
    };
  }

  async loadVendor() {
    // TODO: defs as a property, not state
    const defs = await getDefinitions();
    this.props.$scope.$apply(() => {
      D2ManifestService.isLoaded = true;
    });

    const vendorDef = defs.Vendor.get(this.state.vendorHash);
    if (!vendorDef) {
      throw new Error(`No known vendor with hash ${this.state.vendorHash}`);
    }
    this.setState({ defs, vendorDef });

    // TODO: if we had a cache per vendor (maybe in redux?) we could avoid this load sometimes?

    if (vendorDef.returnWithVendorRequest) {
      // TODO: get for all characters, or let people select a character? This is a hack
      // we at least need to display that character!
      let characterId: string = this.props.$stateParams.characterId;
      if (!characterId) {
        const stores = this.state.stores || await this.props.D2StoresService.getStoresStream(this.props.account).take(1).toPromise();
        characterId = stores.find((s) => s.current)!.id;
      }
      const vendorResponse = await getVendorApi(this.props.account, characterId, this.state.vendorHash);

      this.setState({ defs, vendorResponse });

      const trackerService = await fetchRatingsForVendor(defs, this.props.dimDestinyTrackerService, vendorResponse);
      this.setState({ trackerService });
    } else {
      const trackerService = await fetchRatingsForVendorDef(defs, this.props.dimDestinyTrackerService, vendorDef);
      this.setState({ trackerService });
    }
  }

  componentDidMount() {
    this.storesSubscription = this.props.D2StoresService.getStoresStream(this.props.account).subscribe((stores) => {
      if (stores) {
        const ownedItemHashes = new Set<number>();
        for (const store of stores) {
          for (const item of store.items) {
            ownedItemHashes.add(item.hash);
          }
        }
        this.setState({ stores, ownedItemHashes });
      }
    });
    this.loadVendor();
  }

  componentWillUnmount() {
    this.storesSubscription.unsubscribe();
  }

  render() {
    const { defs, vendorDef, vendorResponse, trackerService, ownedItemHashes } = this.state;

    if (!vendorDef || !defs) {
      // TODO: loading component!
      return <div className="vendor dim-page"><i className="fa fa-spinner fa-spin"/></div>;
    }

    // TODO:
    // * countdown
    // * featured item
    // * enabled
    // * ratings
    // * show which items you have
    // * filter by character class
    const vendor = vendorResponse && vendorResponse.vendor.data;

    const faction = vendorDef.factionHash ? defs.Faction[vendorDef.factionHash] : undefined;
    const factionProgress = vendorResponse && vendorResponse.vendor.data.progression;

    const destinationDef = vendor && defs.Destination.get(vendorDef.locations[vendor.vendorLocationIndex].destinationHash);
    const placeDef = destinationDef && defs.Place.get(destinationDef.placeHash);

    const placeString = [(destinationDef && destinationDef.displayProperties.name), (placeDef && placeDef.displayProperties.name)].filter((n) => n && n.length).join(', ');
    // TODO: there's a cool background image but I'm not sure how to use it

    // TODO: localize
    return (
      <div className="vendor dim-page">
        <div className="vendor-featured">
          <div className="vendor-featured-header">
            {factionProgress && faction
              ? <FactionIcon factionProgress={factionProgress} factionDef={faction}/>
              : <BungieImage src={vendorDef.displayProperties.icon}/>
            }
            <div className="vendor-header-info">
              <h1>{vendorDef.displayProperties.name} <span className="vendor-location">{placeString}</span></h1>
              <div>{vendorDef.displayProperties.description}</div>
              {vendorResponse &&
                <div>Inventory updates in <Countdown endTime={new Date(vendorResponse.vendor.data.nextRefreshDate)}/></div>
              }
            </div>
          </div>
        </div>
        <VendorItems
          defs={defs}
          vendorDef={vendorDef}
          sales={vendorResponse && vendorResponse.sales.data}
          itemComponents={vendorResponse && vendorResponse.itemComponents}
          trackerService={trackerService}
          ownedItemHashes={ownedItemHashes}
          currencyLookups={vendorResponse ? vendorResponse.currencyLookups.data.itemQuantities : {}}
        />
      </div>
    );
  }
}
