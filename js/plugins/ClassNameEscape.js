/*:
 * @target MZ
 * @plugindesc 職業IDに対応する職業名を \J[n] で表示（選択肢でも使えます）[Ver.1.3]
 * @author Akira
 *
 * @help
 * ■ 使用方法
 * ・\J[10] → 職業ID:10 の職業名（例：ファイター）
 * ・メッセージ・選択肢どちらでも使用可能
 *
 * ■ 例：
 * 文章：この職業 → \J[10]
 * 選択肢：「\J[10] にする」「やめる」
 *
 * ■ 注意：
 * ・存在しない職業IDの場合は空白になります
 */

(() => {
    function convertCustomEscapeCharacters(text) {
        return text.replace(/\\J\[(\d+)\]/gi, (_, p1) => {
            const classId = Number(p1);
            const data = $dataClasses[classId];
            return data ? data.name : "";
        });
    }

    const _Window_Base_convertEscapeCharacters = Window_Base.prototype.convertEscapeCharacters;
    Window_Base.prototype.convertEscapeCharacters = function (text) {
        text = convertCustomEscapeCharacters(text);
        text = _Window_Base_convertEscapeCharacters.call(this, text);
        return text;
    };

    const _Window_ChoiceList_addCommand = Window_ChoiceList.prototype.addCommand;
    Window_ChoiceList.prototype.addCommand = function (text, symbol, enabled, ext) {
        text = this.convertEscapeCharacters(text);
        _Window_ChoiceList_addCommand.call(this, text, symbol, enabled, ext);
    };
})();
