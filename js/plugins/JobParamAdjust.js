/*:
 * @target MZ
 * @plugindesc アクターごとのベース能力に職業ごとの補正をかけて成長させるシステムを実装します。職業変更してもベースは保持されます。
 * @author Akira
 *
 * @help
 * ■ 機能概要：
 * - アクターはそれぞれ職業ごとの「基礎職業ID（baseClassId）」を持ちます。
 * - 各職業には `<paramRate:100,120,80,...>` のように能力ごとの補正率（%）を設定可能。
 * - 転職時やレベルアップ時に、アクターのベース能力に補正を掛けたステータスを使用。
 *
 * ■ 使用方法：
 * - アクターのメモ欄に `<baseClassId:X>` を設定（省略時はアクターIDと同じと見なす）
 * - 職業のメモ欄に `<paramRate:100,120,...>` のように補正率を指定
 * - 例：戦士 → <paramRate:120,100,110,100,80,80,100,90>
 *
 * ※補正率は以下の順に 8 つ記述（すべて%）：
 *   [最大HP, 最大MP, 攻撃力, 防御力, 魔法力, 魔法防御, 敏捷性, 運]
 */

(() => {
    const PARAM_COUNT = 8;
    const BASE_KEY = "_baseParams";

    // アクターが持つベース職業IDを取得
    Game_Actor.prototype.baseClassId = function () {
        const meta = this.actor().meta;
        return meta.baseClassId ? Number(meta.baseClassId) : this.actorId();
    };

    // 補正率の取得（メモ欄から）
    function getParamRateArray(classData) {
        const text = classData.meta.paramRate;
        if (!text) return Array(PARAM_COUNT).fill(100);
        return text.split(',').map(e => Number(e.trim()) || 100);
    }

    // ベース能力値を構築
    Game_Actor.prototype.rebuildBaseParams = function () {
        const baseClassId = this.baseClassId();
        const classData = $dataClasses[baseClassId];
        if (!classData || !classData.params) {
            console.warn("ベース職業のパラメータが無効です:", baseClassId);
            return;
        }

        const level = this.level;
        const baseParams = [];

        for (let i = 0; i < PARAM_COUNT; i++) {
            baseParams[i] = classData.params[i][level] || 1;
        }

        this[BASE_KEY] = this[BASE_KEY] || {};
        this[BASE_KEY][baseClassId] = baseParams;
    };

    // 補正込みのパラメータ計算
    Game_Actor.prototype.paramBase = function (paramId) {
        const baseClassId = this.baseClassId();
        const baseParams = this[BASE_KEY]?.[baseClassId];
        if (!baseParams) return 1;

        const currentClass = this.currentClass();
        const rateArray = getParamRateArray(currentClass);
        const rate = rateArray[paramId] || 100;

        return Math.floor(baseParams[paramId] * rate / 100);
    };

    // 転職時に再構築
    const _Game_Actor_changeClass = Game_Actor.prototype.changeClass;
    Game_Actor.prototype.changeClass = function (classId, keepExp) {
        _Game_Actor_changeClass.call(this, classId, keepExp);
        this.rebuildBaseParams();
        this.refresh();
    };

    // レベルアップ時にも再構築
    const _Game_Actor_levelUp = Game_Actor.prototype.levelUp;
    Game_Actor.prototype.levelUp = function () {
        _Game_Actor_levelUp.call(this);
        this.rebuildBaseParams();
    };

    // ゲーム開始時にも初期化
    const _Game_Actor_setup = Game_Actor.prototype.setup;
    Game_Actor.prototype.setup = function (actorId) {
        _Game_Actor_setup.call(this, actorId);
        this.rebuildBaseParams();
    };
})();
