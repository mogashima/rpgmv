/*:
 * @target MZ
 * @plugindesc Ver.2.0 - 武器強化 + ユニークIDを別管理する装備システム（安全装備対応）
 * @author Akira
 *
 * @help
 * ▼ 武器のメモ欄に <rank:A> 等でランクを指定
 * ▼ 強化アイテムのメモ欄に <targetRank:A> を記入
 *
 * ▼ イベントスクリプト:
 *   callWeaponRefine(actorId, slotIndex, itemId)
 *   consumeRefineItemByWeaponRank(actorId, slotIndex)
 */

(() => {
  const ATK_PER_LEVEL = 10;
  const MAX_REFINEMENT_BY_RANK = { C: 1, B: 2, A: 3, S: 4 };

  // ユニークID管理
  const weaponRefineMap = new Map(); // key: actorId-slotId, value: { uuid, level }

  const getMeta = (item, key) => item?.meta?.[key] || null;
  const getWeaponRank = weapon => getMeta(weapon, "rank");
  const getMaxRefineLevel = rank => MAX_REFINEMENT_BY_RANK[rank] || 0;

  function generateUUID(actorId, slotId) {
    return `uid-${actorId}-${slotId}-${Math.random().toString(36).slice(2, 10)}`;
  }

  // レベル取得・設定
  function getWeaponRefineKey(actorId, slotId) {
    return `${actorId}-${slotId}`;
  }

  function getWeaponRefineData(actorId, slotId) {
    return weaponRefineMap.get(getWeaponRefineKey(actorId, slotId)) || { level: 0 };
  }

  function setWeaponRefineData(actorId, slotId, data) {
    weaponRefineMap.set(getWeaponRefineKey(actorId, slotId), data);
  }

  function getWeaponRefineLevel(actorId, slotId) {
    return getWeaponRefineData(actorId, slotId).level || 0;
  }

  function incrementWeaponRefine(actorId, slotId) {
    const data = getWeaponRefineData(actorId, slotId);
    data.level = (data.level || 0) + 1;
    setWeaponRefineData(actorId, slotId, data);
  }

  // 攻撃力補正
  const _Game_Actor_paramPlus = Game_Actor.prototype.paramPlus;
  Game_Actor.prototype.paramPlus = function (paramId) {
    let value = _Game_Actor_paramPlus.call(this, paramId);
    if (paramId === 2) {
      const weapons = this.weapons();
      for (let i = 0; i < weapons.length; i++) {
        value += getWeaponRefineLevel(this.actorId(), i) * ATK_PER_LEVEL;
      }
    }
    return value;
  };

  // 武器名に +X 表示
  const _Window_Base_drawItemName = Window_Base.prototype.drawItemName;
  Window_Base.prototype.drawItemName = function (item, x, y, width) {
    if (item && DataManager.isWeapon(item)) {
      const actor = SceneManager._scene._actor || $gameParty.leader();
      const slotIndex = actor ? actor.weapons().findIndex(w => w === item) : 0;
      const level = getWeaponRefineLevel(actor.actorId(), slotIndex);
      const name = level > 0 ? `${item.name} +${level}` : item.name;
      const iconBoxWidth = ImageManager.iconWidth + 4;
      this.resetTextColor();
      this.drawIcon(item.iconIndex, x, y);
      this.drawText(name, x + iconBoxWidth, y, width - iconBoxWidth);
    } else {
      _Window_Base_drawItemName.call(this, item, x, y, width);
    }
  };

  // 装備スロット表示拡張
  const _Window_EquipSlot_drawItem = Window_EquipSlot.prototype.drawItem;
  Window_EquipSlot.prototype.drawItem = function (index) {
    const rect = this.itemLineRect(index);
    const actor = this._actor;
    if (!actor) return;

    const slotName = TextManager.equipTypes?.[actor.equipSlots()[index]] || "";
    const item = actor.equips()[index];

    this.changeTextColor(ColorManager.systemColor());
    this.drawText(slotName, rect.x, rect.y, 138);
    this.resetTextColor();

    if (item) {
      const level = getWeaponRefineLevel(actor.actorId(), index);
      const name = level > 0 ? `${item.name} +${level}` : item.name;
      const iconBoxWidth = ImageManager.iconWidth + 4;
      this.drawIcon(item.iconIndex, rect.x + 138, rect.y);
      this.drawText(name, rect.x + 138 + iconBoxWidth, rect.y, rect.width - 138 - iconBoxWidth);
    } else {
      this.drawText("-", rect.x + 138, rect.y, rect.width - 138);
    }
  };

  // 強化関数
  window.callWeaponRefine = function (actorId, slotIndex, itemId) {
    const actor = $gameActors.actor(actorId);
    const weapon = actor?.weapons()[slotIndex];
    const item = $dataItems[itemId];
    if (!actor || !weapon || !item) return $gameMessage.add("強化に必要な情報が不足");

    const rank = getWeaponRank(weapon);
    const targetRank = getMeta(item, "targetRank");
    if (!rank || rank !== targetRank) return $gameMessage.add("対応ランクの素材が必要");

    const level = getWeaponRefineLevel(actorId, slotIndex);
    const max = getMaxRefineLevel(rank);
    if (level >= max) return $gameMessage.add(`${weapon.name} は最大 +${max} です`);

    incrementWeaponRefine(actorId, slotIndex);
    $gameParty.loseItem(item, 1);
    $gameMessage.add(`${weapon.name} は +${level + 1} に強化された！`);
  };

  window.consumeRefineItemByWeaponRank = function (actorId, slotIndex) {
    const actor = $gameActors.actor(actorId);
    const weapon = actor?.weapons()[slotIndex];
    if (!actor || !weapon) return $gameMessage.add("装備が見つかりません");

    const rank = getWeaponRank(weapon);
    const item = $dataItems.find(i => i?.meta?.targetRank === rank && $gameParty.hasItem(i));
    if (item) {
      callWeaponRefine(actorId, slotIndex, item.id);
    } else {
      $gameMessage.add(`${rank}ランク対応の素材がありません`);
    }
  };
})();
