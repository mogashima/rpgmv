/*:
 * @target MZ
 * @plugindesc アクター1～4の現在の熟練度をシンプルに表示するプラグイン [ver 1.0]
 * @author Akira
 *
 * @help
 * ▼ 使用方法
 * イベントの「スクリプト」コマンドで以下を呼び出します：
 * 
 *   showSimpleJobProficiency();
 * 
 * ▼ 表示例（メッセージとして表示されます）：
 *   アクター1：熟練度 35
 *   アクター2：熟練度 78
 *   アクター3：熟練度 0
 *   アクター4：熟練度 12
 */

(() => {
    function getJobProficiency(actor, jobId) {
        return actor._jobProficiency?.[jobId] || 0;
    }

    window.showSimpleJobProficiency = function () {
        for (let actorId = 1; actorId <= 4; actorId++) {
            const actor = $gameActors.actor(actorId);
            if (!actor) continue;

            const jobId = actor.currentClass().id;
            const current = getJobProficiency(actor, jobId);
            $gameMessage.add(`${actor.name()}：熟練度 ${current}`);
        }
    };
})();
