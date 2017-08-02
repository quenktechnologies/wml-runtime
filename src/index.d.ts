export declare type Content = Node | Element | HTMLElement;
export interface ContentProvider {
    (): Content;
}
export declare type WMLElement = Content | Widget;
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
}
export declare class Component implements Widget {
    attributes: Attributes;
    children: Content[];
    view: View;
    constructor(attributes: Attributes, children: Content[]);
    rendered(): void;
    removed(): void;
    render(): Content;
}
export interface AttributeMap<A> {
    [key: string]: A;
}
/**
 * Attributes provides an API for reading the
 * attributes supplied to an Element.
 * @param {object} attrs
 */
export declare class Attributes {
    _attrs: any;
    constructor(_attrs: any);
    has(path: string): boolean;
    /**
     * read a value form the internal list.
     * @param {string} path
     * @param {*} defaultValue - This value is returned if the value is not set.
     */
    read<A>(path: string, defaultValue?: A): A;
}
export declare const box: (list: Content[]) => Content;
export declare const empty: () => DocumentFragment;
/**
 * text
 */
export declare const text: (value: string) => Text;
/**
 * resolve property access expression to avoid
 * thowing errors if it does not exist.
 */
export declare const resolve: <A>(head: any, path: string) => string | A;
/**
 * node is called to create a regular DOM node
 * @param {string} tag
 * @param {object} attributes
 * @param {array<string|number|Widget>} children
 * @param {View} view
 */
export declare const node: <A>(tag: string, attributes: AttributeMap<A>, children: Content[], view: AppView) => Node;
/**
 * widget creates a wml widget.
 * @param {function} Construtor
 * @param {object} attributes
 * @param {array<string|number|Widget>} children
 * @param {View} view
 * @return {Widget}
 */
export declare const widget: <P, A>(Constructor: new (...P: any[]) => P, attributes: AttributeMap<A>, children: Content[], view: AppView) => any;
/**
 * ifE provides an if then expression
 */
export declare const ifE: <P>(predicate: P, positive: () => Content, negative: () => Content) => Node;
export interface ForECallback<V> {
    (value: V, index: string | number, source: V[] | object): Content;
}
/**
 * forE provides a for expression
 */
export declare const forE: <V>(collection: object | V[], cb: ForECallback<V>, cb2: ContentProvider) => Content;
export interface SwitchECase {
    [key: string]: ContentProvider;
}
/**
 * switchE simulates a switch statement
 * @param {string|number|boolean} value
 * @param {object} cases
 */
export declare const switchE: (value: string, cases: SwitchECase[]) => any;
export declare class AppView implements View {
    context: object;
    ids: {
        [key: string]: WMLElement;
    };
    widgets: Widget[];
    tree: Content;
    template: () => Node;
    constructor(context: object);
    register(id: string, w: WMLElement): AppView;
    findById(id: string): WMLElement;
    invalidate(): void;
    render(): Content;
}
