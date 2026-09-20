/*:
 * @plugindesc スキル使用時に条件分岐・ランダム対応の台詞を表示し、標準ログを抑制する
 * @author ChatGPT
 *
 * @param HideDefaultActionText
 * @text 標準行動ログを消す
 * @type boolean
 * @on ON
 * @off OFF
 * @default true
 *
 * @param WaitCount
 * @text 台詞表示ウェイト
 * @type number
 * @min 0
 * @default 24
 *
 * @help
 * 戦闘中にスキルを使った時、スキルのメモ欄に書いた台詞を
 * バトルログウィンドウに表示します。
 *
 * このプラグインは以下に対応します。
 * ・「○○の攻撃！」などの標準ログを抑制
 * ・複数候補からランダム表示
 * ・使用者ID条件
 * ・スイッチ条件
 * ・変数条件
 * ・ステート条件
 *
 * --------------------------------------------------
 * ■基本の書き方
 * --------------------------------------------------
 * スキルのメモ欄に以下のどちらかを書きます。
 *
 * 1.
 * <BattleTalk: これで決める！>
 *
 * 2.
 * <BattleTalk>
 * これで決める！
 * </BattleTalk>
 *
 * --------------------------------------------------
 * ■複数候補からランダム
 * --------------------------------------------------
 * <BattleTalk>
 * これで決める！
 * 燃えろ！
 * 逃がさない！
 * </BattleTalk>
 *
 * → 改行ごとに1候補として扱い、ランダムで1つ表示します。
 *
 * --------------------------------------------------
 * ■条件分岐つき
 * --------------------------------------------------
 * 1行ごとに条件を書けます。
 *
 * 書式:
 * 条件 | 台詞
 *
 * 例:
 * actor=1 | これで決める！
 * switch=10 | 今しかない！
 * variable=3>=50 | 十分に力が溜まった！
 * state=5 | まだ倒れない！
 * default | いくぞ！
 *
 * 複数条件も & で連結できます。
 *
 * 例:
 * actor=1 & switch=10 | これで決める！
 * actor=2 & variable=4>=20 | 本気でいくよ！
 *
 * 条件に一致した行だけが候補になります。
 * 一致候補が複数ある場合はその中からランダムで1つ選びます。
 * default は他に一致候補がない時の候補です。
 *
 * --------------------------------------------------
 * ■使える条件
 * --------------------------------------------------
 * actor=1
 * actor!=1
 * enemy=1
 * enemy!=1
 * switch=10
 * switch!=10
 * state=5
 * state!=5
 * variable=3>=10
 * variable=3<=10
 * variable=3>10
 * variable=3<10
 * variable=3==10
 * variable=3!=10
 *
 * ※ actor はアクター使用時
 * ※ enemy は敵使用時
 *
 * --------------------------------------------------
 * ■表示例
 * --------------------------------------------------
 * ハロルド「これで決める！」
 *
 * --------------------------------------------------
 * ■注意
 * --------------------------------------------------
 * ・このプラグインはスキルのみ対象です
 * ・通常攻撃の標準ログも、設定次第で抑制されます
 * ・標準ログを消しても、ダメージ表示やアニメは通常通りです
 */

(function() {
    "use strict";

    var pluginName = "SkillBattleTalkEx";
    var parameters = PluginManager.parameters(pluginName);
    var hideDefaultActionText = String(parameters["HideDefaultActionText"] || "true") === "true";
    var waitCount = Number(parameters["WaitCount"] || 24);

    function getBattleTalkText(item) {
        if (!item) return "";
        if (item.meta && item.meta.BattleTalk) {
            return String(item.meta.BattleTalk);
        }
        var note = item.note || "";
        var match = note.match(/<BattleTalk>([\s\S]*?)<\/BattleTalk>/i);
        return match ? String(match[1]).trim() : "";
    }

    function splitTalkLines(text) {
        if (!text) return [];
        return text.split(/\r?\n/).map(function(line) {
            return line.trim();
        }).filter(function(line) {
            return line.length > 0;
        });
    }

    function isActorSubject(subject) {
        return subject && subject.isActor && subject.isActor();
    }

    function isEnemySubject(subject) {
        return subject && subject.isEnemy && subject.isEnemy();
    }

    function evalSingleCondition(subject, token) {
        token = String(token || "").trim();

        var m;

        m = token.match(/^actor\s*([!=]=?)\s*(\d+)$/i);
        if (m) {
            if (!isActorSubject(subject)) return false;
            var actorId = subject.actorId();
            var opA = m[1];
            var valueA = Number(m[2]);
            if (opA === "=" || opA === "==") return actorId === valueA;
            if (opA === "!=") return actorId !== valueA;
            return false;
        }

        m = token.match(/^enemy\s*([!=]=?)\s*(\d+)$/i);
        if (m) {
            if (!isEnemySubject(subject)) return false;
            var enemyId = subject.enemyId();
            var opE = m[1];
            var valueE = Number(m[2]);
            if (opE === "=" || opE === "==") return enemyId === valueE;
            if (opE === "!=") return enemyId !== valueE;
            return false;
        }

        m = token.match(/^switch\s*([!=]=?)\s*(\d+)$/i);
        if (m) {
            var sw = $gameSwitches.value(Number(m[2]));
            var opS = m[1];
            if (opS === "=" || opS === "==") return sw === true;
            if (opS === "!=") return sw === false;
            return false;
        }

        m = token.match(/^state\s*([!=]=?)\s*(\d+)$/i);
        if (m) {
            var hasState = subject && subject.isStateAffected ? subject.isStateAffected(Number(m[2])) : false;
            var opSt = m[1];
            if (opSt === "=" || opSt === "==") return hasState === true;
            if (opSt === "!=") return hasState === false;
            return false;
        }

        m = token.match(/^variable\s*=\s*(\d+)\s*(>=|<=|==|!=|>|<)\s*(-?\d+)$/i);
        if (m) {
            var v = $gameVariables.value(Number(m[1]));
            var opV = m[2];
            var rhs = Number(m[3]);
            switch (opV) {
                case ">=": return v >= rhs;
                case "<=": return v <= rhs;
                case ">":  return v > rhs;
                case "<":  return v < rhs;
                case "==": return v === rhs;
                case "!=": return v !== rhs;
            }
        }

        return false;
    }

    function evalConditionGroup(subject, expr) {
        var parts = String(expr || "").split("&").map(function(s) {
            return s.trim();
        }).filter(Boolean);

        if (parts.length === 0) return false;

        for (var i = 0; i < parts.length; i++) {
            if (!evalSingleCondition(subject, parts[i])) {
                return false;
            }
        }
        return true;
    }

    function chooseBattleTalk(subject, item) {
        var text = getBattleTalkText(item);
        if (!text) return "";

        var lines = splitTalkLines(text);
        if (lines.length === 0) return "";

        var matched = [];
        var defaults = [];
        var plain = [];

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var sepIndex = line.indexOf("|");

            if (sepIndex >= 0) {
                var cond = line.substring(0, sepIndex).trim();
                var talk = line.substring(sepIndex + 1).trim();
                if (!talk) continue;

                if (/^default$/i.test(cond)) {
                    defaults.push(talk);
                } else if (evalConditionGroup(subject, cond)) {
                    matched.push(talk);
                }
            } else {
                plain.push(line);
            }
        }

        var pool = [];
        if (matched.length > 0) {
            pool = matched;
        } else if (plain.length > 0) {
            pool = plain;
        } else if (defaults.length > 0) {
            pool = defaults;
        }

        if (pool.length === 0) return "";
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function subjectDisplayName(subject) {
        return subject ? subject.name() : "";
    }

    // 標準の「○○の攻撃！」「○○は△△を唱えた！」などを抑制
    if (hideDefaultActionText) {
        Window_BattleLog.prototype.displayAction = function(subject, item) {
            // 何も表示しない
        };
    }

    var _Window_BattleLog_startAction = Window_BattleLog.prototype.startAction;
    Window_BattleLog.prototype.startAction = function(subject, action, targets) {
        var item = action ? action.item() : null;

        if (subject && item && DataManager.isSkill(item)) {
            var talk = chooseBattleTalk(subject, item);
            if (talk) {
                this.push("addText", subjectDisplayName(subject) + "「" + talk + "」");
                if (waitCount > 0) {
                    this.push("waitForCustomTalk");
                }
            }
        }

        _Window_BattleLog_startAction.call(this, subject, action, targets);
    };

    Window_BattleLog.prototype.waitForCustomTalk = function() {
        this._waitCount = waitCount;
    };
})();