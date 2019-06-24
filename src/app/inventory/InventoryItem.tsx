import React from 'react';
import classNames from 'classnames';
import { DimItem } from './item-types';
import './InventoryItem.scss';
import { TagValue, itemTags } from './dim-item-info';
import getBadgeInfo from './get-badge-info';
import BungieImage, { bungieBackgroundStyle } from '../dim-ui/BungieImage';
import { getColor, percent } from '../shell/filters';
import { AppIcon, lockIcon, thumbsUpIcon, stickyNoteIcon } from '../shell/icons';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { InventoryCuratedRoll } from '../curated-rolls/curatedRollService';
import RatingIcon from './RatingIcon';
import WHITE from '../../images/WHITE.png';
import BLUE from '../../images/BLUE.png';
import GREEN from '../../images/GREEN.png';
import PURPLE from '../../images/PURPLE.png';
import YELLOW from '../../images/YELLOW.png';
import { Droppable } from 'react-beautiful-dnd';

const tagIcons: { [tag: string]: IconDefinition | undefined } = {};
itemTags.forEach((tag) => {
  if (tag.type) {
    tagIcons[tag.type] = tag.icon;
  }
});

interface Props {
  item: DimItem;
  /** Show this item as new? */
  isNew?: boolean;
  /** User defined tag */
  tag?: TagValue;
  /**  */
  notes?: boolean;
  /** Rating value */
  rating?: number;
  hideRating?: boolean;
  /** Has this been hidden by a search? */
  searchHidden?: boolean;
  curationEnabled?: boolean;
  inventoryCuratedRoll?: InventoryCuratedRoll;
  /** TODO: item locked needs to be passed in */
  onClick?(e);
  onDoubleClick?(e);
}

// TODO: Separate high and low levels (display vs display logic)
export default class InventoryItem extends React.Component<Props> {
  render() {
    const {
      item,
      isNew,
      tag,
      notes,
      rating,
      searchHidden,
      hideRating,
      curationEnabled,
      inventoryCuratedRoll,
      onClick,
      onDoubleClick
    } = this.props;

    const badgeInfo = getBadgeInfo(item);

    const itemImageStyles = {
      diamond: borderless(item),
      masterwork: item.masterwork,
      complete: item.complete,
      capped: badgeInfo.isCapped,
      exotic: item.isExotic,
      fullstack: item.maxStackSize > 1 && item.amount === item.maxStackSize,
      'search-hidden': searchHidden
    };

    const treatAsCurated = Boolean(curationEnabled && inventoryCuratedRoll);

    const bread = {
      Legendary: PURPLE,
      Rare: BLUE,
      Uncommon: GREEN,
      Common: WHITE,
      Exotic: YELLOW
    }[item.tier];
    let trigger = false;

    return (
      <Droppable droppableId={'droppable' + item.id}>
        {(provided, snapshot) => {
          if (snapshot.isDraggingOver && !trigger) {
            trigger = true;
          }

          return (
            <>
              <div {...provided.droppableProps} ref={provided.innerRef}>
                <div
                  id={item.index}
                  onClick={onClick}
                  onDoubleClick={onDoubleClick}
                  title={`${item.name}\n${item.typeName}`}
                  className={classNames('item', itemImageStyles)}
                >
                  {item.percentComplete > 0 && !item.complete && (
                    <div className="item-xp-bar">
                      <div
                        className="item-xp-bar-amount"
                        style={{ width: percent(item.percentComplete) }}
                      />
                    </div>
                  )}
                  <div
                    style={
                      trigger
                        ? bungieBackgroundStyle(item.icon)
                        : { backgroundImage: `url(${bread})` }
                    }
                    className="item-img"
                  />
                  {badgeInfo.showBadge && (
                    <div className={classNames(badgeInfo.badgeClassNames)}>
                      {item.isDestiny1() && item.quality && (
                        <div
                          className="item-quality"
                          style={getColor(item.quality.min, 'backgroundColor')}
                        >
                          {item.quality.min}%
                        </div>
                      )}
                      {rating !== undefined && !hideRating && (
                        <div className="item-review">
                          <RatingIcon rating={rating} />
                        </div>
                      )}
                      <div className="primary-stat">
                        {item.dmg && <ElementIcon element={item.dmg} />}
                        {badgeInfo.badgeCount}
                      </div>
                    </div>
                  )}
                  {item.masterwork && <div className="overlay" />}
                  {(tag || item.locked || treatAsCurated || notes) && (
                    <div className="icons">
                      {item.locked && <AppIcon className="item-tag" icon={lockIcon} />}
                      {tag && tagIcons[tag] && (
                        <AppIcon className="item-tag" icon={tagIcons[tag]!} />
                      )}
                      {treatAsCurated && <AppIcon className="item-tag" icon={thumbsUpIcon} />}
                      {notes && <AppIcon className="item-tag" icon={stickyNoteIcon} />}
                    </div>
                  )}
                  {isNew && <div className="new-item" />}
                </div>
              </div>
              {provided.placeholder}
            </>
          );
        }}
      </Droppable>
    );
  }
}

function ElementIcon({ element }: { element: DimItem['dmg'] }) {
  const images = {
    arc: 'arc',
    solar: 'thermal',
    void: 'void'
  };

  if (images[element]) {
    return (
      <BungieImage
        className={`element ${element}`}
        src={`/img/destiny_content/damage_types/destiny2/${images[element]}.png`}
      />
    );
  }
  return null;
}

export function borderless(item: DimItem) {
  return (
    (item.isDestiny2 &&
      item.isDestiny2() &&
      (item.bucket.hash === 3284755031 ||
        (item.itemCategoryHashes && item.itemCategoryHashes.includes(268598612)))) ||
    item.isEngram
  );
}
