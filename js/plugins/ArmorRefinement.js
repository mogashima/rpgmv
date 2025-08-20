/*:
 * @target MZ
 * @plugindesc Ver.1.0 - 防具ごとにユニークIDで強化レベルを管理するプラグイン
 * @author Akira
 *
 * @help
 * ▼ 防具のメモ欄に <rank:A> などでランクを指定
 * ▼ 強化素材アイテムのメモ欄に <targetRank:A> を記入
 *
 * ▼ イベントスクリプト:
 *   callArmorRefine(actorId, slotIndex, itemId)
 *   consumeRefineItemByArmorRank(actorId, slotIndex)
 */

(() => {
    const DEF_PER_LEVEL = 5;
    const MAX_REFINEMENT_BY_RANK = { C: 1, B: 2, A: 3, S: 4 };

    const armorRefineMap = new Map(); // key: actorId-slotId, value: { level }

    const getMeta = (item, key) => item?.meta?.[key] || null;
    const getArmorRank = armor => getMeta(armor, "rank");
    const getMaxRefineLevel = rank => MAX_REFINEMENT_BY_RANK[rank] || 0;

    const getRefineKey = (actorId, slotId) => `armor-${actorId}-${slotId}`;
    const getRefineData = (actorId, slotId) => armorRefineMap.get(getRefineKey(actorId, slotId)) || { level: 0 };
    const setRefineData = (actorId, slotId, data) => armorRefineMap.set(getRefineKey(actorId, slotId), data);
    const getRefineLevel = (actorId, slotId) => getRefineData(actorId, slotId).level || 0;
    const incrementRefine = (actorId, slotId) => {
        const data = getRefineData(actorId, slotId);
        data.level = (data.level || 0) + 1;
        setRefineData(actorId, slotId, data);
    };

    // 防御力補正
    const _Game_Actor_paramPlus = Game_Actor.prototype.paramPlus;
    Game_Actor.prototype.paramPlus = function (paramId) {
        let value = _Game_Actor_paramPlus.call(this, paramId);
        if (paramId === 3) { // 防御力ID
            const armors = this.armors();
            for (let i = 0; i < armors.length; i++) {
                value += getRefineLevel(this.actorId(), i) * DEF_PER_LEVEL;
            }
        }
        return value;
    };

    // 名前表示変更（+X）
    const _Window_Base_drawItemName = Window_Base.prototype.drawItemName;
    Window_Base.prototype.drawItemName = function (item, x, y, width) {
        if (item && DataManager.isArmor(item)) {
            const actor = SceneManager._scene._actor || $gameParty.leader();
            const index = actor ? actor.armors().findIndex(a => a === item) : 0;
            const level = getRefineLevel(actor.actorId(), index);
            const name = level > 0 ? `${item.name} +${level}` : item.name;
            const iconBoxWidth = ImageManager.iconWidth + 4;
            this.resetTextColor();
            this.drawIcon(item.iconIndex, x, y);
            this.drawText(name, x + iconBoxWidth, y, width - iconBoxWidth);
        } else {
            _Window_Base_drawItemName.call(this, item, x, y, width);
        }
    };

    // 装備画面用スロット描画拡張
    const _Window_EquipSlot_drawItem = Window_EquipSlot.prototype.drawItem;
    Window_EquipSlot.prototype.drawItem = function (index) {
        const rect = this.itemLineRect(index);
        const actor = this._actor;
        if (!actor) return;

        const slotId = actor.equipSlots()[index];
        const isArmor = DataManager.isArmor(actor.equips()[index]);
        const slotName = TextManager.equipTypes?.[slotId] || "";
        const item = actor.equips()[index];

        this.changeTextColor(ColorManager.systemColor());
        this.drawText(slotName, rect.x, rect.y, 138);
        this.resetTextColor();

        if (item && isArmor) {
            const level = getRefineLevel(actor.actorId(), index);
            const name = level > 0 ? `${item.name} +${level}` : item.name;
            const iconBoxWidth = ImageManager.iconWidth + 4;
            this.drawIcon(item.iconIndex, rect.x + 138, rect.y);
            this.drawText(name, rect.x + 138 + iconBoxWidth, rect.y, rect.width - 138 - iconBoxWidth);
        } else {
            this.drawText("-", rect.x + 138, rect.y, rect.width - 138);
        }
    };

    // 強化処理
    window.callArmorRefine = function (actorId, slotIndex, itemId) {
        const actor = $gameActors.actor(actorId);
        const armor = actor?.armors()[slotIndex];
        const item = $dataItems[itemId];

        if (!actor || !armor || !item) return $gameMessage.add("情報不足で強化できません");

        const rank = getArmorRank(armor);
        const targetRank = getMeta(item, "targetRank");

        if (!rank || rank !== targetRank)
            return $gameMessage.add("対応ランクの強化素材が必要です");

        const level = getRefineLevel(actorId, slotIndex);
        const max = getMaxRefineLevel(rank);

        if (level >= max)
            return $gameMessage.add(`${armor.name} は最大 +${max} です`);

        incrementRefine(actorId, slotIndex);
        $gameParty.loseItem(item, 1);
        $gameMessage.add(`${armor.name} は +${level + 1} に強化された！`);
    };

    // 自動強化処理（素材探索）
    window.consumeRefineItemByArmorRank = function (actorId, slotIndex = 0) {
        const actor = $gameActors.actor(actorId);
        const armor = actor?.armors()[slotIndex];
        if (!actor || !armor) return $gameMessage.add("装備が見つかりません");

        const rank = getArmorRank(armor);
        const item = $dataItems.find(i => i?.meta?.targetRank === rank && $gameParty.hasItem(i));

        if (item) {
            callArmorRefine(actorId, slotIndex, item.id);
        } else {
            $gameMessage.add(`${rank}ランク対応の素材がありません`);
        }
    };

})();
