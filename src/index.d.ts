export declare type Content = Node | Element | HTMLElement;
export declare type WMLElement = Content | Widget;
export declare type TextOrNodeCandidate = string | boolean | number | object;
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
export interface ContentProvider {
    (): Content;
}
export interface Macro<P> {
    (view: View, ...p: P[]): Content;
}
export declare class Component<A> implements Widget {
    attributes: Attributes<A>;
    children: Content[];
    view: View;
    constructor(attributes: Attributes<A>, children: Content[]);
    rendered(): void;
    removed(): void;
    render(): Content;
}
export interface AttributeMap<A> {
    [key: string]: A;
}
export interface Attrs {
    wml: {
        id?: string;
    };
    html: AttributeMap<string | number | boolean | Function>;
}
/**
 * Attributes provides an API for reading the
 * attributes supplied to an Element.
 */
export declare class Attributes<A> {
    attrs: A;
    constructor(attrs: A);
    has(path: string): boolean;
    /**
     * read a value form the internal list.
     * @param {string} path
     * @param {*} defaultValue - This value is returned if the value is not set.
     */
    read<A>(path: string, defaultValue?: A): A;
}
export declare const box: (...content: Content[]) => Content;
export declare const _box: (list: Content[]) => Content;
export declare const empty: () => DocumentFragment;
/**
 * text
 */
export declare const text: (value: string | number | boolean) => Text;
/**
 * resolve property access expression to avoid
 * thowing errors if it does not exist.
 */
export declare const resolve: <A>(head: any, path: string) => string | A;
/**
 * node is called to create a regular DOM node
 */
export declare const node: <A, C>(tag: string, attributes: AttributeMap<A>, children: Content[], view: AppView<C>) => Node;
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
export declare const widget: <C, A>(Constructor: WidgetConstructor<A>, attributes: A, children: Content[], view: AppView<C>) => Content;
/**
 * ifE provides an if then expression
 */
export declare const ifE: <P>(predicate: P, positive: () => Content, negative: () => Content) => Node;
export interface ForECallback<V> {
    (value: V, index?: string | number, source?: V[] | object): Content;
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
export declare const switchE: (value: string, cases: SwitchECase) => ContentProvider;
export declare class AppView<C> implements View {
    context: C;
    ids: {
        [key: string]: WMLElement;
    };
    widgets: Widget[];
    tree: Content;
    template: () => Node;
    constructor(context: C);
    register(id: string, w: WMLElement): AppView<C>;
    findById(id: string): WMLElement;
    invalidate(): void;
    render(): Content;
}
