import React from 'react';
import { DimItem } from '../inventory/item-types';
import { InventoryBucket } from '../inventory/inventory-buckets';
import { AppIcon, addIcon } from '../shell/icons';
import LoadoutDrawerItem from './LoadoutDrawerItem';
import { LoadoutItem } from './loadout-types';
import { sortItems } from '../shell/filters';

export default function LoadoutDrawerBucket({
  bucket,
  loadoutItems,
  items,
  itemSortOrder,
  pickLoadoutItem,
  equip,
  remove,
}: {
  bucket: InventoryBucket;
  loadoutItems: LoadoutItem[];
  items: DimItem[];
  itemSortOrder: string[];
  pickLoadoutItem(bucket: InventoryBucket): void;
  equip(item: DimItem, e: React.MouseEvent): void;
  remove(item: DimItem, e: React.MouseEvent): void;
}) {
  if (!bucket.type) {
    return null;
  }

  const equippedItem = items.find((i) =>
    loadoutItems.some((li) => li.id === i.id && li.hash === i.hash && li.equipped)
  );
  const unequippedItems = sortItems(
    items.filter((i) =>
      loadoutItems.some((li) => li.id === i.id && li.hash === i.hash && !li.equipped)
    ),
    itemSortOrder
  );

  return (
    <div className="loadout-bucket">
      {equippedItem || unequippedItems.length > 0 ? (
        <>
          <div className="loadout-bucket-name">{bucket.name}</div>
          <div className={`loadout-bucket-items bucket-${bucket.type}`}>
            <div className="sub-bucket equipped">
              <div className="equipped-item">
                {equippedItem ? (
                  <LoadoutDrawerItem item={equippedItem} equip={equip} remove={remove} />
                ) : (
                  <a onClick={() => pickLoadoutItem(bucket)} className="pull-item-button">
                    <AppIcon icon={addIcon} />
                  </a>
                )}
              </div>
            </div>
            {(equippedItem || unequippedItems.length > 0) && bucket.type !== 'Class' && (
              <div className="sub-bucket">
                {unequippedItems.map((item) => (
                  <LoadoutDrawerItem key={item.index} item={item} equip={equip} remove={remove} />
                ))}
                {equippedItem && unequippedItems.length < 9 && bucket.type !== 'Class' && (
                  <a onClick={() => pickLoadoutItem(bucket)} className="pull-item-button">
                    <AppIcon icon={addIcon} />
                  </a>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <a onClick={() => pickLoadoutItem(bucket)} className="dim-button loadout-add">
          <AppIcon icon={addIcon} /> {bucket.name}
        </a>
      )}
    </div>
  );
}
