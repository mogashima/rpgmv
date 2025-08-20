/*:
 * @target MZ
 * @plugindesc 敵撃破時に熟練度ポイントをプラグイン内に蓄積し、勝利時にまとめてアクターの熟練度に加算するプラグインです。
 * @author Akira
 *
 * @help
 * - 敵のメモ欄に <jobProficiency:50> と書いて熟練度ポイントを設定
 * - 敵撃破時にポイントを一時蓄積
 * - 戦闘勝利時にまとめて全パーティメンバーの現在ジョブに加算
 * - 加算後はポイントをリセット
 */

(() => {
  const jpKey = "_jobProficiency";
  let totalPoint = 0;  // プラグイン内でポイントを蓄積

  Game_Actor.prototype.getJobProficiency = function (jobId) {
    if (!this[jpKey]) this[jpKey] = {};
    return this[jpKey][jobId] || 0;
  };

  Game_Actor.prototype.addJobProficiency = function (jobId, amount) {
    if (!this[jpKey]) this[jpKey] = {};
    this[jpKey][jobId] = (this[jpKey][jobId] || 0) + amount;
    this.checkJobSkills(jobId);
  };

  Game_Actor.prototype.checkJobSkills = function (jobId) {
    const proficiency = this.getJobProficiency(jobId);

    const JOB_SKILL_TABLE = {
      // ファイター
      10: [
        { threshold: 5, skillId: 172 },   // 強撃
        { threshold: 30, skillId: 173 },  // 薙ぎ払い
        { threshold: 40, skillId: 176 }, // 応急処置
        { threshold: 50, skillId: 174 },   // 連続攻撃
        { threshold: 120, skillId: 175 }, // 気合い
        { threshold: 250, skillId: 201 }, // 風車
      ],
      // メイジ
      11: [
        { threshold: 5, skillId: 99 },      // ファイアⅠ
        { threshold: 5, skillId: 107 },     // アイスⅠ
        { threshold: 5, skillId: 115 },     // サンダーⅠ
        { threshold: 20, skillId: 71 },     // ポイズン
        { threshold: 40, skillId: 103 },    // フレイムⅠ
        { threshold: 40, skillId: 111 },    // ブリザードⅠ
        { threshold: 40, skillId: 119 },    // スパークⅠ
        { threshold: 50, skillId: 72 },     // ブラインド
        { threshold: 60, skillId: 74 },     // サイレンス
        { threshold: 200, skillId: 100 },   // ファイアⅡ
        { threshold: 200, skillId: 108 },   // アイスⅡ
        { threshold: 200, skillId: 116 },   // サンダーⅡ
        { threshold: 300, skillId: 104 },   // フレイムⅡ
        { threshold: 300, skillId: 112 },   // ブリザードⅡ
        { threshold: 300, skillId: 120 },   // スパークⅡ
        { threshold: 600, skillId: 76 },    // パラライズ
        { threshold: 750, skillId: 101 },   // ファイアⅢ
        { threshold: 750, skillId: 109 },   // アイスⅢ
        { threshold: 750, skillId: 117 },   // サンダーⅢ
        { threshold: 900, skillId: 105 },   // フレイムⅢ
        { threshold: 900, skillId: 113 },   // ブリザードⅢ
        { threshold: 900, skillId: 121 },   // スパークⅢ
      ],
      // プリースト
      12: [
        { threshold: 5, skillId: 52 },    // ヒールⅠ
        { threshold: 15, skillId: 56 },   // リカバーⅠ
        { threshold: 25, skillId: 60 },   // キュアーⅠ
        { threshold: 30, skillId: 141 },  // セイントⅠ
        { threshold: 180, skillId: 53 },  // ヒールⅡ
        { threshold: 190, skillId: 64 },  // レイズⅠ
        { threshold: 230, skillId: 57 },  // リカバーⅡ
        { threshold: 280, skillId: 61 },  // キュアーⅡ
        { threshold: 400, skillId: 144 }, // スターライトⅠ
        { threshold: 700, skillId: 186 }, // マジックバリア
        { threshold: 750, skillId: 54 },  // ヒールⅢ
        { threshold: 850, skillId: 58 },  // リカバーⅢ
        { threshold: 900, skillId: 62 },  // キュアーⅢ
        { threshold: 1000, skillId: 65 }, // レイズⅡ
      ],
      // モンク
      13: [
        { threshold: 10, skillId: 216 },  // 足払い
        { threshold: 30, skillId: 217 },  // 気孔術
        { threshold: 40, skillId: 218 },  // 回し蹴り
        { threshold: 250, skillId: 219 }, // 猛虎乱舞
        { threshold: 500, skillId: 200 },  // スピーダー
        { threshold: 800, skillId: 220 },  // 瞑想
      ],
      // ニンジャ
      14: [
        { threshold: 10, skillId: 199 }, // 抜刀
        { threshold: 30, skillId: 196 },  // かとん
        { threshold: 30, skillId: 197 },  // せっとん
        { threshold: 30, skillId: 198 },  // らいとん
        { threshold: 400, skillId: 200 },  // スピーダー
      ],
    };

    const skills = JOB_SKILL_TABLE[jobId] || [];

    for (const { threshold, skillId } of skills) {
      if (proficiency >= threshold && !this.isLearnedSkill(skillId)) {
        this.learnSkill(skillId);
        const skillName = $dataSkills[skillId]?.name || "新しいスキル";
        $gameMessage.add(`${this.name()}は『${skillName}』を覚えた！`);
      }
    }
  };

  // 敵撃破時に熟練度ポイントを蓄積
  const _Game_Enemy_performCollapse = Game_Enemy.prototype.performCollapse;
  Game_Enemy.prototype.performCollapse = function () {
    _Game_Enemy_performCollapse.call(this);

    if (this.isDead()) {
      const proficiency = Number(this.enemy().meta.jobProficiency || 0);
      if (proficiency > 0) {
        totalPoint += proficiency;
      }
    }
  };

  // 戦闘勝利時にまとめてポイント加算＆リセット
  const _BattleManager_processVictory = BattleManager.processVictory;
  BattleManager.processVictory = function () {
    _BattleManager_processVictory.call(this);

    if (totalPoint > 0) {
      $gameMessage.add(`熟練度を${totalPoint}獲得した！`);
      $gameParty.members().forEach(actor => {
        if (!actor) return;
        const jobId = actor.currentClass().id;
        actor.addJobProficiency(jobId, totalPoint);
      });
      totalPoint = 0;
    }
  };
})();
