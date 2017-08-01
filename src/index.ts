import { property } from 'property-seek';

export type Content = Node | Element | HTMLElement;

export interface ContentProvider {

    (): Content[]

}

export type WMLElement = Content | Widget;

export interface Renderable {

    render(): Content;

}

export interface View extends Renderable {

    invalidate(): void;
    findById(id: string): WMLElement;

}

export interface Widget extends Renderable {

    rendered(): void;
    removed(): void;

};

export interface AttributeMap<A> {

    [key: string]: A

}

/**
 * Attributes provides an API for reading the
 * attributes supplied to an Element.
 * @param {object} attrs
 */
class Attributes {

    constructor(public _attrs: any) { }

    has(path: string): boolean {

        return this.read(path) != null;

    }

    /**
     * read a value form the internal list.
     * @param {string} path
     * @param {*} defaultValue - This value is returned if the value is not set.
     */
    read<A>(path: string, defaultValue?: A): A {

        var ret = property(path.split(':').join('.'), this._attrs);
        return (ret != null) ? ret : (defaultValue != null) ? defaultValue : '';

    }

}


const adopt = (child, e) => {

    if (Array.isArray(child))
        return child.forEach(innerChild => adopt(innerChild, e));

    if (child)
        e.appendChild(
            (typeof child === 'object') ?
                child : document.createTextNode(child == null ? '' : child));

};

/**
 * text
 */
export const text = (value: string): Text =>
    document.createTextNode(value == null ? '' : value);

/**
 * resolve property access expression to avoid
 * thowing errors if it does not exist.
 */
export const resolve = <A>(head: any, path: string): A | string => {

    if ((head == null) || head == '')
        return '';

    var ret = property(path, head);

    return (ret == null) ? '' : ret;

};

/**
 * node is called to create a regular DOM node
 * @param {string} tag
 * @param {object} attributes
 * @param {array<string|number|Widget>} children
 * @param {View} view
 */
export const node = <A>(tag: string, attributes: AttributeMap<A>, children: Content[], view: AppView): Node => {

    var e = document.createElement(tag);

    if (typeof attributes['html'] === 'object')
        Object.keys(attributes['html']).forEach(key => {

            if (typeof attributes['html'][key] === 'function') {
                e[key] = attributes['html'][key];
            } else if ((attributes['html'][key] != null) && (attributes['html'][key] != '')) {
                e.setAttribute(key, attributes['html'][key]);
            }
        });

    children.forEach(c => adopt(c, e));

    if (attributes['wml'])
        if (attributes['wml']['id'])
            view.register(attributes['wml']['id'], e);

    return e;

}

/**
 * widget creates a wml widget.
 * @param {function} Construtor
 * @param {object} attributes
 * @param {array<string|number|Widget>} children
 * @param {View} view
 * @return {Widget}
 */
export const widget =
    <P, A>(Constructor: { new (...P): P },
        attributes: AttributeMap<A>,
        children: Content[],
        view: AppView) => {

        var childs = [];
        var w;

        children.forEach(child => Array.isArray(child) ?
            childs.push.apply(childs, child) : childs.push(child));

        w = new Constructor(new Attributes(attributes), childs);

        if (attributes['wml'])
            if (attributes['wml']['id'])
                view.register(attributes['wml']['id'], w);

        view.widgets.push(w);
        return w.render();

    }

/**
 * ifE provides an if then expression
 */
export const ifE = <P>(predicate: P, positive: () => Content[], negative: () => Content[]) =>
    (predicate) ? positive() : negative();


type Iterable<V> = V[] | object;

export interface ForECallback<V> {

    (value: V, index: string | number, source: V[] | object): void;

}

/**
 * forE provides a for expression
 * @param {Iterable} collection
 * @param {function} cb
 */
export const forE = <V>(collection: Iterable<V>, cb: ForECallback<V>, cb2: ContentProvider) => {

    if (collection instanceof Array) {

        return collection.length > 0 ? collection.map(cb) : cb2();

    } else if (typeof collection === 'object') {

        var l = Object.keys(collection);

        return (l.length > 0) ?
            l.map((key, _, all) => cb(collection[key], key, all)) : cb2;

    }

    return [];

}

export interface SwitchECase {

    [key: string]: ContentProvider;

}

/**
 * switchE simulates a switch statement
 * @param {string|number|boolean} value
 * @param {object} cases
 */
export const switchE = (value: string, cases: SwitchECase[]) => {

    var result = cases[value];
    var defaul = cases['default'];

    if (result) return result;

    if (defaul) return defaul;

}

export class AppView implements View {

    ids: { [key: string]: WMLElement } = {};
    widgets: Widget[] = [];
    tree: Content;
    template: () => Node;

    constructor(public context: object) { }

    register(id: string, w: WMLElement): AppView {


        if (this.ids.hasOwnProperty(id))
            throw new Error(`Duplicate id '${id}' detected!`);

        this.ids[id] = w;
        return this;

    }

    findById(id: string): WMLElement {

        return (this.ids[id]) ? this.ids[id] : null;

    }

    invalidate(): void {

        var childs;
        var parent = this.tree.parentNode;
        var realFirstChild;
        var realFirstChildIndex;

        if (this.tree == null)
            throw new ReferenceError('Cannot invalidate a view that has not been rendered!');

        if (this.tree.parentNode == null)
            throw new ReferenceError('Attempt to invalidate a view that has not been inserted to DOM!');

        childs = (<Element>this.tree.parentNode).children;

        //for some reason the reference stored does not have the correct parent node.
        //we do this to get a 'live' version of the node.
        for (let i = 0; i < childs.length; i++)
            if (childs[i] === this.tree) {
                realFirstChild = childs[i];
                realFirstChildIndex = i;
            }

        parent.replaceChild(this.render(), realFirstChild);

    }

    render(): Content {

        this.ids = {};
        this.widgets.forEach(w => w.removed());
        this.widgets = [];
        this.tree = this.template.call(this.context);
        this.ids['root'] = (this.ids['root']) ? this.ids['root'] : this.tree;
        this.widgets.forEach(w => w.rendered());

        return this.tree;

    }

}
