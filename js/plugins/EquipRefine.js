/*:
 * @target MZ
 * @plugindesc Ver.1.2 - 装備（武器・防具）をスロットID + アイテムIDで管理し強化レベルを保持・表示するプラグイン（セーブ対応）
 * @author Akira
 *
 * @help
 * ▼ 武器・防具のメモ欄に <rank:A> 等でランクを指定
 * ▼ 強化アイテムのメモ欄に <targetRank:A> を記入
 *
 * ▼ イベントスクリプト例：
 *   callEquipRefine(actorId, slotId, itemId)
 *   consumeRefineItemByEquipRank(actorId, slotId)
 */

(() => {
    const ATK_PER_LEVEL = 10;
    const DEF_PER_LEVEL = 5;
    const MAX_REFINEMENT_BY_RANK = { C: 3, B: 3, A: 4, S: 5 };
    const INCREASED_VALUE_BY_RANK = { C: 1, B: 2, A: 3, S: 4 };

    // 強化管理Map（キー: actorId-slotId-itemId, 値: {level}）
    const equipRefineMap = new Map();

    // メタデータ取得
    function getMeta(item, key) {
        return item?.meta?.[key] || null;
    }

    // 装備ランク取得
    function getEquipRank(item) {
        return getMeta(item, "rank");
    }

    // 最大強化レベル取得
    function getMaxRefineLevel(rank) {
        return MAX_REFINEMENT_BY_RANK[rank] || 0;
    }

    // 上昇値取得
    function getIncreasedValue(rank) {
        return INCREASED_VALUE_BY_RANK[rank] || 0;
    }

    // 装備キー生成
    function getEquipKey(actorId, slotId, itemId) {
        return `${actorId}-${slotId}-${itemId}`;
    }

    // 強化レベル取得
    function getEquipRefineLevel(actorId, slotId, itemId) {
        const data = equipRefineMap.get(getEquipKey(actorId, slotId, itemId));
        return data ? data.level || 0 : 0;
    }

    // 強化レベル設定
    function setEquipRefineLevel(actorId, slotId, itemId, level) {
        equipRefineMap.set(getEquipKey(actorId, slotId, itemId), { level });
    }

    // --- 保存用関数 ---
    function saveEquipRefineData() {
        const obj = {};
        equipRefineMap.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
    }

    // --- ロード用関数 ---
    function loadEquipRefineData(data) {
        equipRefineMap.clear();
        if (data) {
            for (const key in data) {
                equipRefineMap.set(key, data[key]);
            }
        }
    }

    // --- Game_System 初期化時の初期化 ---
    const _Game_System_initialize = Game_System.prototype.initialize;
    Game_System.prototype.initialize = function() {
        _Game_System_initialize.call(this);
        this._equipRefineData = {};
    };

    // --- セーブデータ生成時に装備強化データを保存 ---
    const _DataManager_makeSaveContents = DataManager.makeSaveContents;
    DataManager.makeSaveContents = function() {
        const contents = _DataManager_makeSaveContents.call(this);
        contents.equipRefineData = saveEquipRefineData();
        return contents;
    };

    // --- セーブデータ読込時に装備強化データを復元 ---
    const _DataManager_extractSaveContents = DataManager.extractSaveContents;
    DataManager.extractSaveContents = function(contents) {
        _DataManager_extractSaveContents.call(this, contents);
        loadEquipRefineData(contents.equipRefineData);
    };

    // --- ステータス補正 ---
    const _Game_Actor_paramPlus = Game_Actor.prototype.paramPlus;
    Game_Actor.prototype.paramPlus = function(paramId) {
        let value = _Game_Actor_paramPlus.call(this, paramId);
        const equips = this.equips();
        for (let slotId = 0; slotId < equips.length; slotId++) {
            const equip = equips[slotId];
            if (!equip) continue;
            const level = getEquipRefineLevel(this.actorId(), slotId, equip.id);
            const rank = getEquipRank(equip);
            if (paramId === 2 && DataManager.isWeapon(equip)) {  // 攻撃力
                value += level * getIncreasedValue(rank);
            } else if (paramId === 3 && DataManager.isArmor(equip)) {  // 防御力
                value += level * getIncreasedValue(rank);
            }
        }
        return value;
    };

    // --- アイテム名表示 ---
    const _Window_Base_drawItemName = Window_Base.prototype.drawItemName;
    Window_Base.prototype.drawItemName = function(item, x, y, width) {
        if (item) {
            const actor = SceneManager._scene?._actor || $gameParty.leader();
            const slotId = actor ? actor.equips().findIndex(e => e === item) : -1;
            const level = (slotId >= 0 && actor) ? getEquipRefineLevel(actor.actorId(), slotId, item.id) : 0;
            const name = level > 0 ? `${item.name} +${level}` : item.name;
            const iconBoxWidth = ImageManager.iconWidth + 4;
            this.resetTextColor();
            this.drawIcon(item.iconIndex, x, y);
            this.drawText(name, x + iconBoxWidth, y, width - iconBoxWidth);
        } else {
            _Window_Base_drawItemName.call(this, item, x, y, width);
        }
    };

    // --- 装備画面表示拡張 ---
    const _Window_EquipSlot_drawItem = Window_EquipSlot.prototype.drawItem;
    Window_EquipSlot.prototype.drawItem = function(index) {
        const rect = this.itemLineRect(index);
        const actor = this._actor;
        const item = actor?.equips()[index];

        this.changeTextColor(ColorManager.systemColor());
        const slotName = TextManager.equipTypes?.[actor?.equipSlots()[index]] || "";
        this.drawText(slotName, rect.x, rect.y, 138);
        this.resetTextColor();

        if (item) {
            const level = getEquipRefineLevel(actor.actorId(), index, item.id);
            const name = level > 0 ? `${item.name} +${level}` : item.name;
            const iconBoxWidth = ImageManager.iconWidth + 4;
            this.drawIcon(item.iconIndex, rect.x + 138, rect.y);
            this.drawText(name, rect.x + 138 + iconBoxWidth, rect.y, rect.width - 138 - iconBoxWidth);
        } else {
            this.drawText("-", rect.x + 138, rect.y, rect.width - 138);
        }
    };

    // --- 強化実行関数 ---
    window.callEquipRefine = function(actorId, slotId, itemId) {
        const actor = $gameActors.actor(actorId);
        if (!actor) return $gameMessage.add("アクターが存在しません。");

        const equip = actor.equips()[slotId];
        const material = $dataItems[itemId];
        if (!equip || !material) return $gameMessage.add("装備または素材が無効です。");

        const rank = getEquipRank(equip);
        const targetRank = getMeta(material, "targetRank");
        if (rank !== targetRank) return $gameMessage.add("ランクが一致していません。");

        const level = getEquipRefineLevel(actorId, slotId, equip.id);
        const max = getMaxRefineLevel(rank);
        if (level >= max) return $gameMessage.add(`これ以上強化できません（最大 +${max}）`);

        setEquipRefineLevel(actorId, slotId, equip.id, level + 1);
        $gameParty.loseItem(material, 1);
        $gameMessage.add(`${equip.name} は +${level + 1} に強化された！`);
    };

    // --- 所持素材による自動強化 ---
    window.consumeRefineItemByEquipRank = function(actorId, slotId) {
        const actor = $gameActors.actor(actorId);
        const equip = actor?.equips()[slotId];
        if (!actor || !equip) return $gameMessage.add("装備が見つかりません。");

        const rank = getEquipRank(equip);
        const item = $dataItems.find(i => i?.meta?.targetRank === rank && $gameParty.hasItem(i));
        if (item) {
            callEquipRefine(actorId, slotId, item.id);
        } else {
            $gameMessage.add(`${rank}ランク素材を所持していません。`);
        }
    };

})();
