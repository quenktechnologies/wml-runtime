import property from 'property-seek';

export type Content
    = Node
    | Element
    | HTMLElement;

export type WMLElement
    = Content
    | Widget;

export type TextOrNodeCandidate
    = string |
    boolean |
    number |
    object;

type Iterable<V> = V[] | object;

export interface Renderable {

    render(): Content;

}

export interface View extends Renderable {

    invalidate(): void;
    findById(id: string): WMLElement;
    findGroupByName(name: string): WMLElement[];

}

export interface Widget extends Renderable {

    rendered(): void;
    removed(): void;

};

export interface ContentProvider {

    (): Content

}

export interface Macro<P> {

    (view: View, ...p: P[]): Content

}

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

    wml: {

        id?: string,
        group?: string

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

        return this.read(path, null) != null;

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

    // if (child instanceof Array)
    // return child.forEach(innerChild => adopt(innerChild, e));

    switch (typeof child) {
        case 'string':
        case 'number':
        case 'boolean':
            e.appendChild(document.createTextNode('' + child));
        case 'object':
            e.appendChild(<Node>child);
            break;
        default:
            throw new TypeError(`Can not adopt child ${child} of type ${typeof child}`);

    }

};

export const box = (...content: Content[]): Content => {

    let frag = document.createDocumentFragment();
    content.forEach(c => frag.appendChild(c));
    return frag;

};

export const domify = <A>(a: A): Content => {

    if (a instanceof Array) {
        return box.apply(null, a.map(domify));

    } else if (
        (typeof a === 'string') ||
        (typeof a === 'number') ||
        (typeof a === 'boolean')) {

        return text(a);

    } else if (a instanceof Node) {

        return a;

    } else if (a == null) {

        return _empty;

    } else {

        throw new TypeError(`Can not use '${a}'(typeof ${typeof a}) as Content!`);

    }

};

const _empty = document.createDocumentFragment();

export const empty = () => _empty;

/**
 * text
 */
export const text = (value: boolean | number | string): Text =>
    document.createTextNode('' + value);

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
 */
export const node = <A, C>(
    tag: string,
    attributes: AttributeMap<A>,
    children: Content[],
    view: AppView<C>): Node => {

    var e = document.createElement(tag);

    if (typeof attributes['html'] === 'object')
        Object.keys(attributes['html']).forEach(key => {

            let value = (<any>attributes['html'])[key];

            if (typeof value === 'function') {
                (<any>e)[key] = value;
            } else if (typeof value === 'string') {

                if (value !== '') //prevent setting things like disabled=''
                    e.setAttribute(key, value);

            } else if (typeof value === 'boolean') {

                e.setAttribute(key, `${value}`);

            }

        });

    children.forEach(c => adopt(c, e));

    let id = (<any>attributes['wml']).id;
    let group = (<Attrs><any>attributes).wml.group;

    if (id)
        view.register(id, e);

    if (group)
        view.registerGroup(group, e);

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

        let id = (<Attrs><any>attributes).wml.id;
        let group = (<Attrs><any>attributes).wml.group;

        if (id)
            view.register(id, w);

        if (group)
            view.registerGroup(group, w);

        view.widgets.push(w);

        return w.render();

    }

/**
 * ifE provides an if then expression
 */
export const ifE = <P>(predicate: P, positive: () => Content, negative: () => Content) =>
    (predicate) ? positive() : negative();

export interface ForECallback<V> {

    (value: V, index?: string | number, source?: V[] | object): Content;

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
            l.forEach(k => frag.appendChild(cb((<any>collection)[k], k, collection)));
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
    groups: { [key: string]: WMLElement[] } = {};
    widgets: Widget[] = [];
    tree: Content;
  template: (c:C) => Node;
    _fragRoot: Node;

    constructor(public context: C) { }

    register(id: string, w: WMLElement): AppView<C> {

        if (this.ids.hasOwnProperty(id))
            throw new Error(`Duplicate id '${id}' detected!`);

        this.ids[id] = w;

        return this;

    }

    registerGroup(group: string, e: WMLElement): AppView<C> {

        this.groups[group] = this.groups[group] || [];
        this.groups[group].push(e);

        return this;

    }

    findById(id: string): WMLElement {

        return (this.ids[id]) ? this.ids[id] : null;

    }

    findGroupByName(name: string): WMLElement[] {

        return (this.groups.hasOwnProperty(name)) ? this.groups[name] : [];

    }

    invalidate(): void {

        var childs;
        var realFirstChild;
        var realFirstChildIndex;
        var tree = (this._fragRoot) ? this._fragRoot : this.tree;
        var parent = tree.parentNode;

        if (tree == null)
            throw new ReferenceError('Cannot invalidate a view that has not been rendered!');

        if (tree.parentNode == null)
            throw new ReferenceError('Attempt to invalidate a view that has not been inserted to DOM!');

        childs = (<Element>tree.parentNode).children;

        //for some reason the reference stored does not have the correct parent node.
        //we do this to get a 'live' version of the node.
        for (let i = 0; i < childs.length; i++)
            if (childs[i] === tree) {
                realFirstChild = childs[i];
                realFirstChildIndex = i;
            }

        parent.replaceChild(this.render(), realFirstChild);

    }

    render(): Content {

        this.ids = {};
        this.widgets.forEach(w => w.removed());
        this.widgets = [];
        this._fragRoot = null;
        this.tree = this.template(this.context);
        this.ids['root'] = (this.ids['root']) ? this.ids['root'] : this.tree;

        if (this.tree.nodeName === (document.createDocumentFragment()).nodeName)
            this._fragRoot = this.tree.firstChild;

        this.widgets.forEach(w => w.rendered());

        return this.tree;

    }

}
