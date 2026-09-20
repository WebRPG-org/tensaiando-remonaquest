/*:
 * @plugindesc 主人公の習得スキルを4列ウィンドウで表示して選択・使用できるプラグイン(MV用)
 * @author OpenAI
 *
 * @param Columns
 * @text 列数
 * @type number
 * @min 1
 * @default 4
 *
 * @param WindowX
 * @text ウィンドウX
 * @type number
 * @default 0
 *
 * @param WindowY
 * @text ウィンドウY
 * @type number
 * @default 0
 *
 * @param WindowWidth
 * @text ウィンドウ幅
 * @type number
 * @default 816
 *
 * @param WindowHeight
 * @text ウィンドウ高さ
 * @type number
 * @default 300
 *
 * @param ShowMessage
 * @text 表示時メッセージ
 * @type string
 * @default 使用するスキルを選択してください。
 *
 * @help
 * 【概要】
 * 主人公(アクターID 1)が覚えているスキルのうち、
 * スキルタイプ 2 のみを一覧表示し、
 * プレイヤーが選んで使用できるウィンドウを表示します。
 *
 * スキル一覧は横4列で表示され、4つ並ぶと自動で折り返されます。
 *
 * 【プラグインコマンド】
 * SkillWindow Show
 *   スキル選択画面を開きます
 *
 * SkillWindow Hide
 *   スキル選択画面を閉じます
 *
 * 【仕様】
 * ・対象は主人公(アクターID 1)
 * ・スキルタイプ 2 のみ表示
 * ・使用可能なスキルのみ決定可能
 * ・スキル使用後は自動でウィンドウを閉じる
 * ・メニュー画面風の専用シーンで表示
 * ・スキル使用対象の選択が必要な場合は味方単体対象を選ばせます
 *
 * 【注意】
 * ・バトル中ではなくマップ上で使う想定です
 * ・ダメージ計算や効果適用はMV標準処理を使います
 */

(function() {
    'use strict';

    var pluginName = 'SkillSelectWindowMV';
    var params = PluginManager.parameters(pluginName);

    var columns = Number(params['Columns'] || 4);
    var windowX = Number(params['WindowX'] || 0);
    var windowY = Number(params['WindowY'] || 0);
    var windowWidth = Number(params['WindowWidth'] || Graphics.boxWidth);
    var windowHeight = Number(params['WindowHeight'] || 300);
    var showMessage = String(params['ShowMessage'] || '使用するスキルを選択してください。');

    var _skillWindowVisibleFlag = false;
    var TARGET_STYPE_ID = 2;

    function mainActor() {
        return $gameActors.actor(1);
    }

    function playBuzzer() {
        SoundManager.playBuzzer();
    }

    function playOk() {
        SoundManager.playOk();
    }

    function useSkillOnMap(user, skill, target) {
        if (!user || !skill || !target) {
            return false;
        }

        var action = new Game_Action(user);
        action.setSkill(skill.id);

        if (!user.canUse(skill)) {
            return false;
        }

        user.useItem(skill);

        var repeats = action.numRepeats();
        for (var i = 0; i < repeats; i++) {
            action.apply(target);
        }
        action.applyGlobal();

        return true;
    }

    function Window_SkillSelectHelp() {
        this.initialize.apply(this, arguments);
    }

    Window_SkillSelectHelp.prototype = Object.create(Window_Help.prototype);
    Window_SkillSelectHelp.prototype.constructor = Window_SkillSelectHelp;

    Window_SkillSelectHelp.prototype.initialize = function(numLines) {
        Window_Help.prototype.initialize.call(this, numLines);
        this.setText(showMessage);
    };

    function Window_SkillSelectList() {
        this.initialize.apply(this, arguments);
    }

    Window_SkillSelectList.prototype = Object.create(Window_Selectable.prototype);
    Window_SkillSelectList.prototype.constructor = Window_SkillSelectList;

    Window_SkillSelectList.prototype.initialize = function(x, y, width, height) {
        Window_Selectable.prototype.initialize.call(this, x, y, width, height);
        this._actor = null;
        this._data = [];
        this.refresh();
        this.activate();
        this.select(0);
    };

    Window_SkillSelectList.prototype.setActor = function(actor) {
        if (this._actor !== actor) {
            this._actor = actor;
            this.refresh();
            this.resetScroll();
            this.select(0);
        }
    };

    Window_SkillSelectList.prototype.maxCols = function() {
        return columns;
    };

    Window_SkillSelectList.prototype.maxItems = function() {
        return this._data ? this._data.length : 0;
    };

    Window_SkillSelectList.prototype.item = function() {
        return this._data && this.index() >= 0 ? this._data[this.index()] : null;
    };

    Window_SkillSelectList.prototype.makeItemList = function() {
        if (this._actor) {
            this._data = this._actor.skills().filter(function(skill) {
                return skill && skill.stypeId === TARGET_STYPE_ID;
            });
        } else {
            this._data = [];
        }
    };

    Window_SkillSelectList.prototype.isCurrentItemEnabled = function() {
        var skill = this.item();
        return !!(this._actor && skill && this._actor.canUse(skill));
    };

    Window_SkillSelectList.prototype.drawItem = function(index) {
        var skill = this._data[index];
        if (!skill) {
            return;
        }

        var rect = this.itemRect(index);
        rect.width -= this.textPadding();

        this.changePaintOpacity(this._actor && this._actor.canUse(skill));
        this.drawItemName(skill, rect.x, rect.y, rect.width);
        this.changePaintOpacity(true);
    };

    Window_SkillSelectList.prototype.refresh = function() {
        this.makeItemList();
        this.createContents();
        this.drawAllItems();
    };

    Window_SkillSelectList.prototype.updateHelp = function() {
        if (this._helpWindow) {
            var skill = this.item();
            this._helpWindow.setText(skill ? skill.description || showMessage : showMessage);
        }
    };

    function Window_SkillTargetActor() {
        this.initialize.apply(this, arguments);
    }

    Window_SkillTargetActor.prototype = Object.create(Window_MenuActor.prototype);
    Window_SkillTargetActor.prototype.constructor = Window_SkillTargetActor;

    Window_SkillTargetActor.prototype.initialize = function() {
        Window_MenuActor.prototype.initialize.call(this);
        this.hide();
    };

    function Scene_SkillSelect() {
        this.initialize.apply(this, arguments);
    }

    Scene_SkillSelect.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_SkillSelect.prototype.constructor = Scene_SkillSelect;

    Scene_SkillSelect.prototype.initialize = function() {
        Scene_MenuBase.prototype.initialize.call(this);
    };

    Scene_SkillSelect.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this.createHelpWindow();
        this.createSkillWindow();
        this.createTargetWindow();
    };

    Scene_SkillSelect.prototype.createHelpWindow = function() {
        this._helpWindow = new Window_SkillSelectHelp(2);
        this.addWindow(this._helpWindow);
    };

    Scene_SkillSelect.prototype.createSkillWindow = function() {
        var y = this._helpWindow.height + windowY;
        var h = Math.min(windowHeight, Graphics.boxHeight - y);
        this._skillWindow = new Window_SkillSelectList(windowX, y, windowWidth, h);
        this._skillWindow.setHelpWindow(this._helpWindow);
        this._skillWindow.setActor(mainActor());
        this._skillWindow.setHandler('ok', this.onSkillOk.bind(this));
        this._skillWindow.setHandler('cancel', this.onSkillCancel.bind(this));
        this.addWindow(this._skillWindow);
    };

    Scene_SkillSelect.prototype.createTargetWindow = function() {
        this._targetWindow = new Window_SkillTargetActor();
        this._targetWindow.setHandler('ok', this.onTargetOk.bind(this));
        this._targetWindow.setHandler('cancel', this.onTargetCancel.bind(this));
        this.addWindow(this._targetWindow);
    };

    Scene_SkillSelect.prototype.onSkillOk = function() {
        var actor = mainActor();
        var skill = this._skillWindow.item();

        if (!actor || !skill) {
            playBuzzer();
            this._skillWindow.activate();
            return;
        }

        if (!actor.canUse(skill)) {
            playBuzzer();
            this._skillWindow.activate();
            return;
        }

        var action = new Game_Action(actor);
        action.setSkill(skill.id);

        if (action.isForFriend()) {
            if (action.isForUser()) {
                this.applySkill(actor);
            } else {
                this._targetWindow.show();
                this._targetWindow.activate();
                this._targetWindow.selectForItem(skill);
            }
        } else {
            this.applySkill(actor);
        }
    };

    Scene_SkillSelect.prototype.onSkillCancel = function() {
        _skillWindowVisibleFlag = false;
        SceneManager.pop();
    };

    Scene_SkillSelect.prototype.onTargetOk = function() {
        var target = $gameParty.members()[this._targetWindow.index()];
        this.applySkill(target);
    };

    Scene_SkillSelect.prototype.onTargetCancel = function() {
        this._targetWindow.hide();
        this._targetWindow.deactivate();
        this._skillWindow.activate();
    };

    Scene_SkillSelect.prototype.applySkill = function(target) {
        var actor = mainActor();
        var skill = this._skillWindow.item();

        if (!actor || !skill || !target) {
            playBuzzer();
            this._targetWindow.hide();
            this._targetWindow.deactivate();
            this._skillWindow.activate();
            return;
        }

        var success = useSkillOnMap(actor, skill, target);

        if (success) {
            playOk();
            this._targetWindow.hide();
            this._targetWindow.deactivate();
            this._skillWindow.refresh();
            _skillWindowVisibleFlag = false;
            SceneManager.pop();
        } else {
            playBuzzer();
            this._targetWindow.hide();
            this._targetWindow.deactivate();
            this._skillWindow.activate();
        }
    };

    var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);

        if (command === 'SkillWindow') {
            var sub = args[0];
            if (sub === 'Show') {
                _skillWindowVisibleFlag = true;
                SceneManager.push(Scene_SkillSelect);
            } else if (sub === 'Hide') {
                _skillWindowVisibleFlag = false;
                if (SceneManager._scene instanceof Scene_SkillSelect) {
                    SceneManager.pop();
                }
            }
        }
    };

})();