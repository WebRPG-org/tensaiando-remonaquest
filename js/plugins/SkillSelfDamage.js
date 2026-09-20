/*:
 * @plugindesc スキル使用後、メモ欄に指定した数値ぶん使用者が自傷ダメージを受ける
 * @author ChatGPT
 *
 * @param LeaveHpOne
 * @text 自傷でHP1残す
 * @type boolean
 * @on ON
 * @off OFF
 * @default true
 *
 * @help
 * ■概要
 * スキルのメモ欄に以下のように書くと、
 * そのスキル使用後に使用者が自傷ダメージを受けます。
 *
 *   <SelfDamage: 50>
 *
 * 例:
 *   <SelfDamage: 100>
 *   → スキル使用後、使用者が100ダメージ受ける
 *
 * ■仕様
 * - 対象は「スキル」のみです
 * - ダメージはスキル使用後に発生します
 * - 複数対象スキルでも、自傷ダメージは1回だけです
 * - 防御力や属性などは影響しない固定ダメージです
 * - プラグインパラメータ「自傷でHP1残す」がONのとき、
 *   自傷ダメージでは必ずHPが1残ります
 *
 * ■メモ欄記述
 * <SelfDamage: 数字>
 *
 * 例:
 * <SelfDamage: 30>
 */

(function() {
    "use strict";

    var pluginName = "SkillSelfDamage";
    var parameters = PluginManager.parameters(pluginName);
    var leaveHpOne = String(parameters["LeaveHpOne"] || "true") === "true";

    var _BattleManager_startAction = BattleManager.startAction;
    BattleManager.startAction = function() {
        var action = this._subject ? this._subject.currentAction() : null;
        this._selfDamageValue = 0;

        if (action) {
            var item = action.item();
            if (DataManager.isSkill(item)) {
                this._selfDamageValue = Number(item.meta.SelfDamage || 0);
            }
        }

        _BattleManager_startAction.call(this);
    };

    var _BattleManager_endAction = BattleManager.endAction;
    BattleManager.endAction = function() {
        var subject = this._subject;
        var damage = Number(this._selfDamageValue || 0);

        if (subject && damage > 0 && subject.isAlive()) {
            var actualDamage = damage;

            if (leaveHpOne) {
                actualDamage = Math.min(damage, Math.max(subject.hp - 1, 0));
            }

            if (actualDamage > 0) {
                subject.clearResult();
                subject.gainHp(-actualDamage);
                subject.startDamagePopup();
                subject.performDamage();
            }
        }

        this._selfDamageValue = 0;
        _BattleManager_endAction.call(this);
    };
})();