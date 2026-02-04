/*:
 * @plugindesc イベント用 戦闘スキル選択画面（対象選択なし・MV）
 * @author ChatGPT
 */

(function() {

function Scene_EventBattleSkill() {
    this.initialize.apply(this, arguments);
}

Scene_EventBattleSkill.prototype = Object.create(Scene_MenuBase.prototype);
Scene_EventBattleSkill.prototype.constructor = Scene_EventBattleSkill;

Scene_EventBattleSkill.prototype.initialize = function() {
    Scene_MenuBase.prototype.initialize.call(this);
};

Scene_EventBattleSkill.prototype.create = function() {
    Scene_MenuBase.prototype.create.call(this);
    this._actor = $gameParty.leader();
    this.createSkillWindow();
};

Scene_EventBattleSkill.prototype.createSkillWindow = function() {
    const wx = 0;
    const wy = 0;
    const ww = Graphics.boxWidth;
    const wh = Graphics.boxHeight;

    this._skillWindow = new Window_SkillList(wx, wy, ww, wh);
    this._skillWindow.setActor(this._actor);

    this._skillWindow.setHandler('ok', this.onSkillOk.bind(this));
    this._skillWindow.setHandler('cancel', this.popScene.bind(this));

    this.addWindow(this._skillWindow);
    this._skillWindow.activate();
};

Scene_EventBattleSkill.prototype.onSkillOk = function() {
    const skill = this._skillWindow.item();
    if (!skill) {
        this.popScene();
        return;
    }

    this.useSkill(skill);
    this.popScene();
};

Scene_EventBattleSkill.prototype.useSkill = function(skill) {
    const user = this._actor;

    if (!user.canUse(skill)) return;

    user.useItem(skill);

    // 使用結果を変数などに保存したい場合はここ
    $gameVariables.setValue(1, skill.id);

    $gameParty.refresh();
};

window.Scene_EventBattleSkill = Scene_EventBattleSkill;

})();
