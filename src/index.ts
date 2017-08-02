import property from 'property-seek';

export type Content
    = Node
    | Element
    | HTMLElement;

export interface ContentProvider {

    (): Content

}

export interface Macro<P> {

    (view: View, ...p: P[]): Content

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

export class Component<A> implements Widget {

    view: View;

    constructor(public attributes: Attributes<A>, public children: Content[]) { }

    rendered(): void { }

    removed(): void { }

    render(): Content { return this.view.render(); }

};

export interface AttributeMap<A> {

    [key: string]: A

}

export interface Attrs {

    wml?: {

        id?: string

    },
    html: AttributeMap<string | number | boolean | Function>

}

/**
 * Attributes provides an API for reading the
 * attributes supplied to an Element.
 */
export class Attributes<A> {

    constructor(public attrs: A) { }

    has(path: string): boolean {

        return this.read(path) != null;

    }

    /**
     * read a value form the internal list.
     * @param {string} path
     * @param {*} defaultValue - This value is returned if the value is not set.
     */
    read<A>(path: string, defaultValue?: A): A {

        var ret = property(path.split(':').join('.'), this.attrs);
        return (ret != null) ? ret : (defaultValue != null) ? defaultValue : '';

    }

}


const adopt = (child: Content, e: Node): void => {

    if (child instanceof Array)
        return child.forEach(innerChild => adopt(innerChild, e));

    if (child)
        e.appendChild(
            (typeof child === 'object') ?
                child : document.createTextNode(child == null ? '' : child));

};

export type TextOrNodeCandidate
    = string |
    boolean |
    number |
    object;

const _textOrNode = (c: TextOrNodeCandidate): Node => {

    if (c instanceof Node)
        return c;

    if (typeof c === 'object')
        throw new TypeError(`Cannot use type '${typeof c}' as a Text node!`);

    return document.createTextNode('' + (c == null ? '' : c));

}

export const box = (list: Content[]): Content => {

    if (list.length === 1) {

        return _textOrNode(list[0]);

    } else {

        let frag = document.createDocumentFragment();
        list.forEach(c => frag.appendChild(_textOrNode(c)));
        return frag;

    }

};

const _empty = document.createDocumentFragment();

export const empty = () => _empty;

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
export const node = <A, C>(tag: string, attributes: AttributeMap<A>, children: Content[], view: AppView<C>): Node => {

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

export interface WidgetConstructor<A> {

    new (attributes: Attributes<A>, children: Content[]): Widget;

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
    <C, A>(
        Constructor: WidgetConstructor<A>,
        attributes: A,
        children: Content[],
        view: AppView<C>): Content => {

        var childs: Content[] = [];
        var w;

        children.forEach(child => (child instanceof Array) ?
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
export const ifE = <P>(predicate: P, positive: () => Content, negative: () => Content) =>
    (predicate) ? positive() : negative();


type Iterable<V> = V[] | object;

export interface ForECallback<V> {

    (value: V, index: string | number, source: V[] | object): Content;

}

/**
 * forE provides a for expression
 */
export const forE = <V>(
    collection: Iterable<V>,
    cb: ForECallback<V>,
    cb2: ContentProvider): Content => {

    var frag = document.createDocumentFragment();

    if (collection instanceof Array) {

        if (collection.length > 0)
            collection.forEach((v, k, a) => frag.appendChild(cb(v, k, a)));
        else
            frag.appendChild(cb2());

    } else if (typeof collection === 'object') {

        var l = Object.keys(collection);

        if (l.length > 0)
            l.forEach(k => frag.appendChild(cb(collection[k], k, collection)));
        else
            frag.appendChild(cb2());

    }

    return frag;

}

export interface SwitchECase {

    [key: string]: ContentProvider;

}

/**
 * switchE simulates a switch statement
 * @param {string|number|boolean} value
 * @param {object} cases
 */
export const switchE = (value: string, cases: SwitchECase) => {

    var result = cases[value];
    var defaul = cases['default'];

    if (result) return result;

    if (defaul) return defaul;

}

export class AppView<C> implements View {

    ids: { [key: string]: WMLElement } = {};
    widgets: Widget[] = [];
    tree: Content;
    template: () => Node;

    constructor(public context: C) { }

    register(id: string, w: WMLElement): AppView<C> {


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