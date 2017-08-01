"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var property_seek_1 = require("property-seek");
;
/**
 * Attributes provides an API for reading the
 * attributes supplied to an Element.
 * @param {object} attrs
 */
var Attributes = (function () {
    function Attributes(_attrs) {
        this._attrs = _attrs;
    }
    Attributes.prototype.has = function (path) {
        return this.read(path) != null;
    };
    /**
     * read a value form the internal list.
     * @param {string} path
     * @param {*} defaultValue - This value is returned if the value is not set.
     */
    Attributes.prototype.read = function (path, defaultValue) {
        var ret = property_seek_1.property(path.split(':').join('.'), this._attrs);
        return (ret != null) ? ret : (defaultValue != null) ? defaultValue : '';
    };
    return Attributes;
}());
var adopt = function (child, e) {
    if (Array.isArray(child))
        return child.forEach(function (innerChild) { return adopt(innerChild, e); });
    if (child)
        e.appendChild((typeof child === 'object') ?
            child : document.createTextNode(child == null ? '' : child));
};
/**
 * text
 */
exports.text = function (value) {
    return document.createTextNode(value == null ? '' : value);
};
/**
 * resolve property access expression to avoid
 * thowing errors if it does not exist.
 */
exports.resolve = function (head, path) {
    if ((head == null) || head == '')
        return '';
    var ret = property_seek_1.property(path, head);
    return (ret == null) ? '' : ret;
};
/**
 * node is called to create a regular DOM node
 * @param {string} tag
 * @param {object} attributes
 * @param {array<string|number|Widget>} children
 * @param {View} view
 */
exports.node = function (tag, attributes, children, view) {
    var e = document.createElement(tag);
    if (typeof attributes['html'] === 'object')
        Object.keys(attributes['html']).forEach(function (key) {
            if (typeof attributes['html'][key] === 'function') {
                e[key] = attributes['html'][key];
            }
            else if ((attributes['html'][key] != null) && (attributes['html'][key] != '')) {
                e.setAttribute(key, attributes['html'][key]);
            }
        });
    children.forEach(function (c) { return adopt(c, e); });
    if (attributes['wml'])
        if (attributes['wml']['id'])
            view.register(attributes['wml']['id'], e);
    return e;
};
/**
 * widget creates a wml widget.
 * @param {function} Construtor
 * @param {object} attributes
 * @param {array<string|number|Widget>} children
 * @param {View} view
 * @return {Widget}
 */
exports.widget = function (Constructor, attributes, children, view) {
    var childs = [];
    var w;
    children.forEach(function (child) { return Array.isArray(child) ?
        childs.push.apply(childs, child) : childs.push(child); });
    w = new Constructor(new Attributes(attributes), childs);
    if (attributes['wml'])
        if (attributes['wml']['id'])
            view.register(attributes['wml']['id'], w);
    view.widgets.push(w);
    return w.render();
};
/**
 * ifE provides an if then expression
 */
exports.ifE = function (predicate, positive, negative) {
    return (predicate) ? positive() : negative();
};
/**
 * forE provides a for expression
 * @param {Iterable} collection
 * @param {function} cb
 */
exports.forE = function (collection, cb, cb2) {
    if (collection instanceof Array) {
        return collection.length > 0 ? collection.map(cb) : cb2();
    }
    else if (typeof collection === 'object') {
        var l = Object.keys(collection);
        return (l.length > 0) ?
            l.map(function (key, _, all) { return cb(collection[key], key, all); }) : cb2;
    }
    return [];
};
/**
 * switchE simulates a switch statement
 * @param {string|number|boolean} value
 * @param {object} cases
 */
exports.switchE = function (value, cases) {
    var result = cases[value];
    var defaul = cases['default'];
    if (result)
        return result;
    if (defaul)
        return defaul;
};
var AppView = (function () {
    function AppView(context) {
        this.context = context;
        this.ids = {};
        this.widgets = [];
    }
    AppView.prototype.register = function (id, w) {
        if (this.ids.hasOwnProperty(id))
            throw new Error("Duplicate id '" + id + "' detected!");
        this.ids[id] = w;
        return this;
    };
    AppView.prototype.findById = function (id) {
        return (this.ids[id]) ? this.ids[id] : null;
    };
    AppView.prototype.invalidate = function () {
        var childs;
        var parent = this.tree.parentNode;
        var realFirstChild;
        var realFirstChildIndex;
        if (this.tree == null)
            throw new ReferenceError('Cannot invalidate a view that has not been rendered!');
        if (this.tree.parentNode == null)
            throw new ReferenceError('Attempt to invalidate a view that has not been inserted to DOM!');
        childs = this.tree.parentNode.children;
        //for some reason the reference stored does not have the correct parent node.
        //we do this to get a 'live' version of the node.
        for (var i = 0; i < childs.length; i++)
            if (childs[i] === this.tree) {
                realFirstChild = childs[i];
                realFirstChildIndex = i;
            }
        parent.replaceChild(this.render(), realFirstChild);
    };
    AppView.prototype.render = function () {
        this.ids = {};
        this.widgets.forEach(function (w) { return w.removed(); });
        this.widgets = [];
        this.tree = this.template.call(this.context);
        this.ids['root'] = (this.ids['root']) ? this.ids['root'] : this.tree;
        this.widgets.forEach(function (w) { return w.rendered(); });
        return this.tree;
    };
    return AppView;
}());
exports.AppView = AppView;
//# sourceMappingURL=index.js.map