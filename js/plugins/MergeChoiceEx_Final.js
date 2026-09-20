/*:
 * @plugindesc MV用 選択肢横並び統合拡張（条件表示・注釈禁止対応・最終版）
 * @author ChatGPT
 */

(() => {

const _command102 = Game_Interpreter.prototype.command102;

/* ------------------------------
 * 条件付き選択肢判定
 * ------------------------------ */
function filterChoiceText(text) {
    let t = text;

    // Switch条件
    t = t.replace(/\\SW\[(\d+)(,!)?\]/gi, (_, id, inv) => {
        const v = $gameSwitches.value(+id);
        return (inv ? !v : v) ? "" : null;
    });
    if (t === null) return null;

    // Variable条件
    t = t.replace(
        /\\VAR\[(\d+)(==|!=|>=|<=|>|<)(-?\d+)\]/gi,
        (_, id, op, n) => {
            const v = $gameVariables.value(+id);
            n = +n;
            const ok = {
                "==": v == n,
                "!=": v != n,
                ">=": v >= n,
                "<=": v <= n,
                ">": v > n,
                "<": v < n
            }[op];
            return ok ? "" : null;
        }
    );
    return t;
}

/* ------------------------------
 * 次の選択肢探索（注釈・禁止対応）
 * ------------------------------ */
Game_Interpreter.prototype.findNextChoiceSameIndent = function(i) {
    const indent = this._list[i].indent;
    for (let n = i + 1; n < this._list.length; n++) {
        const c = this._list[n];

        if (c.indent !== indent) return null;

        // 注釈が挟まったら即中止
        if (c.code === 108 || c.code === 408) {
            if (c.parameters[0].includes("横並び禁止")) return null;
            return null;
        }

        if (c.code === 102) return n;
    }
    return null;
};

/* ------------------------------
 * 選択肢統合処理
 * ------------------------------ */
Game_Interpreter.prototype.command102 = function() {
    const i1 = this._index;
    const i2 = this.findNextChoiceSameIndent(i1);
    if (i2 === null) {
        return _command102.call(this);
    }

    const c1 = this._list[i1];
    const c2 = this._list[i2];

    const merged = [];
    const map = [];

    [c1, c2].forEach((cmd, ci) => {
        cmd.parameters[0].forEach((txt, ti) => {
            const t = filterChoiceText(txt);
            if (t !== null) {
                map.push({ ci, ti });
                merged.push(t);
            }
        });
    });

    if (!merged.length) {
        this._index = i2 + 1;
        return true;
    }

    // MV正規ルート
    $gameMessage.setChoices(
        merged,
        c1.parameters[1],
        c2.parameters[1]
    );

    $gameMessage.setChoiceCallback(n => {
        const m = map[n];
        this._branch[this._indent] = m.ti;
    });

    // 横並び有効化
    $gameMessage._mergeHorizontal = true;

    this._index = i2 + 1;
    return true;
};

/* ------------------------------
 * Window_ChoiceList 拡張
 * ------------------------------ */
const _maxCols = Window_ChoiceList.prototype.maxCols;
Window_ChoiceList.prototype.maxCols = function() {
    if ($gameMessage._mergeHorizontal) return 3;
    return _maxCols.call(this);
};

const _cursorDown = Window_ChoiceList.prototype.cursorDown;
Window_ChoiceList.prototype.cursorDown = function(wrap) {
    if ($gameMessage._mergeHorizontal) {
        const cols = this.maxCols();
        const i = this.index();
        if (i + cols < this.maxItems()) this.select(i + cols);
        return;
    }
    _cursorDown.call(this, wrap);
};

const _cursorUp = Window_ChoiceList.prototype.cursorUp;
Window_ChoiceList.prototype.cursorUp = function(wrap) {
    if ($gameMessage._mergeHorizontal) {
        const cols = this.maxCols();
        const i = this.index();
        if (i - cols >= 0) this.select(i - cols);
        return;
    }
    _cursorUp.call(this, wrap);
};

const _endSelection = Window_ChoiceList.prototype.endSelection;
Window_ChoiceList.prototype.endSelection = function() {
    $gameMessage._mergeHorizontal = false;
    _endSelection.call(this);
};

})();
