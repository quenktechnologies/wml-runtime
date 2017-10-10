import * as property from 'property-seek';

/**
 * WMLElement can be DOM content or a user defined widget. 
 */
export type WMLElement
    = Content
    | Widget
    ;

/**
 * Content is what is actually intended to be rendered on a web page.
 */
export type Content
    = Node
    | Element
    | HTMLElement
    ;

/**
 * @private
 */
type Iterable<V> = V[] | object;

/**
 * Renderable is an interface for providing Content.
 *
 * When AppView#render is called, it calls the render
 * method of this interface for each widget it encounters.
 *
 * This interface can be used in places where we want to 
 * accept something that can be rendered but don't want
 * all the additional baggage of a view.
 */
export interface Renderable {

    render(): Content;

}

/**
 * View instances are compiled from wml template files.
 * 
 * They provide an api for rendering user interfaces and
 * querying individual objects(WMLElement) it is made of.
 */
export interface View extends Renderable {

    /**
     * invalidate this View causing the DOM to be re-rendered.
     *
     * Re-rendering is done by finding the parentNode of the root
     * of the View's Content and replacing it with a new version.
     * If the view has not yet been added to the DOM, this will fail.
     */
    invalidate(): void;

    /**
     * findById retrives a WMLElement that has been assigned a `wml:id` 
     * attribute matching id.
     */
    findById(id: string): WMLElement;

    /**
     * findGroupByName retrives an array of WMLElements that have a `wml:group`
     * attribute matching name.
     */
    findGroupByName(name: string): WMLElement[];

}

/**
 *
 * Widget is the user land api of custom Renderable objects
 * that provide desired functionality.
 *
 * It has two lifecycle methods that are recognized by View.
 */
export interface Widget extends Renderable {

    /**
     * rendered is called after the Widget has been added to a DOM tree.
     */
    rendered(): void;

    /**
     * removed is only called after the View has been invalidated. 
     *
     * That means it is NOT called if the Widget is removed from the DOM in some other way.
     */
    removed(): void;

};

/**
 * Template is a function that given a View and a Context 
 * will provide DOM content. 
 */
export interface Template<C> {

    (view: View, context: C): Content

}

/**
 * Component is an abstract Widget implementation
 * that can be used instead of manually implementing the whole interface.
 *
 */
export class Component<A extends Attrs> implements Widget {

    /**
     * view for this Component.
     *
     * The render method by default returns the render result of this View.
     */
    view: View;

    /**
     * attrs is the attributes this Component excepts.
     */

  /**
   * children is an array of content passed to this Component.
   */

    constructor(public attrs: A, public children: Content[]) { }

    rendered(): void { }

    removed(): void { }

    render(): Content { return this.view.render(); }

};

/**
 * AttributeMap is a map of values suitable for attributes on
 * a DOM Node.
 */
export interface AttributeMap<A> {

    [key: string]: A

}

/**
 * Attrs is an interface describing the minimum attributes
 * a Widget can have.
 *
 * Extend this interface when creating custom Widgets so attributes
 * can be passed in a type safe way.
 */
export interface Attrs {

    wml: {

        id?: string,
        group?: string

    },
    html: AttributeMap<string | number | boolean | Function>

}

/**
 * read a value form an object.
 *
 * This is an alternative to regular property access that will throw exceptions
 * if any of the values in the part are null.
 * @param {string} path - The path to look up on the object.
 * @param {object} o - The object
 * @param {A} [defaultValue] - This value is returned if the value is not set.
 * @private
 */
export const read = <A>(path: string, o: object, defaultValue?: A): A => {

    let ret = property.get<A, object>(path.split(':').join('.'), o);

    return (ret != null) ? ret : defaultValue;

}

/**
 * @private
 */
const adopt = (child: Content, e: Node): void => {

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

/**
 * @private
 */
export const box = (...content: Content[]): Content => {

    let frag = document.createDocumentFragment();
    content.forEach(c => frag.appendChild(c));
    return frag;

};

/**
 * @private
 */
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

/**
 * @private
 */
const _empty = document.createDocumentFragment();

/**
 * @private
 */
export const empty = () => _empty;

/**
 * text creates a new TextNode.
 * @private
 */
export const text = (value: boolean | number | string): Text =>
    document.createTextNode('' + value);

/**
 * node is called to create a regular DOM node
 * @private
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

/**
 * @private
 */
export interface WidgetConstructor<A> {

    new (attributes: A, children: Content[]): Widget;

}

/**
 * widget creates and renders a new wml widget instance.
 * @param {function} Construtor
 * @param {object} attributes
 * @param {array<string|number|Widget>} children
 * @param {View} view
 * @private
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

        w = new Constructor(attributes, childs);

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
 * @private
 */
export const ifE = <P>(predicate: P, positive: () => Content, negative: () => Content) =>
    (predicate) ? positive() : negative();

/**
 * @private
 */
export interface ForECallback<V> {

    (value: V, index?: string | number, source?: V[] | object): Content;

}

/**
 * forE provides a for expression
 * @private
 */
export const forE = <V>(
    collection: Iterable<V>,
    cb: ForECallback<V>,
    cb2: () => Content): Content => {

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

/**
 * @private
 */
export interface SwitchECase {

    [key: string]: () => Content;

}

/**
 * switchE simulates a switch statement
 * @param {string|number|boolean} value
 * @param {object} cases
 * @private
 */
export const switchE = (value: string, cases: SwitchECase) => {

    var result = cases[value];
    var defaul = cases['default'];

    if (result) return result;

    if (defaul) return defaul;

}

/**
 * AppView is the concrete implementation of a View.
 *
 * @property {<C>} context - The context the view is rendered in.
 */
export class AppView<C> implements View {

    ids: { [key: string]: WMLElement } = {};
    groups: { [key: string]: WMLElement[] } = {};
    widgets: Widget[] = [];
    tree: Content;
    template: Template<C>;
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
        this.tree = this.template(this, this.context);
        this.ids['root'] = (this.ids['root']) ? this.ids['root'] : this.tree;

        if (this.tree.nodeName === (document.createDocumentFragment()).nodeName)
            this._fragRoot = this.tree.firstChild;

        this.widgets.forEach(w => w.rendered());

        return this.tree;

    }

}
