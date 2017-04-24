import scrollbarWidth from 'scrollbarwidth';
import debounce from 'lodash.debounce';
import ResizeObserver from 'resize-observer-polyfill';


export default class SimpleBar {
    constructor(element, options) {
        this.el = element;
        this.track;
        this.scrollbar;
        this.flashTimeout;
        this.contentEl;
        this.scrollContentEl;
        this.dragOffset         = { x: 0, y: 0 };
        this.isVisible          = { x: true, y: true };
        this.scrollOffsetAttr   = { x: 'scrollLeft', y: 'scrollTop' };
        this.sizeAttr           = { x: 'offsetWidth', y: 'offsetHeight' };
        this.scrollSizeAttr     = { x: 'scrollWidth', y: 'scrollHeight' };
        this.offsetAttr         = { x: 'left', y: 'top' };
        this.globalObserver;
        this.mutationObserver;
        this.resizeObserver;
        this.currentAxis;
        this.options = Object.assign({}, SimpleBar.defaultOptions, options);
        this.classNames = this.options.classNames;
        this.scrollbarWidth = scrollbarWidth();
        this.offsetSize = 15;
        // If scrollbar is a floating scrollbar, disable the plugin
        this.enabled = this.scrollbarWidth !== 0 || this.options.forceEnabled;

        this.flashScrollbar = this.flashScrollbar.bind(this);
        this.onScrollY = this.onScrollY.bind(this);
        this.onScrollX = this.onScrollX.bind(this);
        this.onDrag = this.onDrag.bind(this);
        this.drag = this.drag.bind(this);
        this.onEndDrag = this.onEndDrag.bind(this);
        this.onMouseEnter = this.onMouseEnter.bind(this);

        this.recalculate = debounce(this.recalculate, 100, { leading: true, trailing: false });

        this.init();
    }

    static get defaultOptions() {
        return {
            wrapContent: true,
            autoHide: true,
            forceEnabled: false,
            classNames: {
                content: 'simplebar-content',
                scrollContent: 'simplebar-scroll-content',
                scrollbar: 'simplebar-scrollbar',
                track: 'simplebar-track'
            },
            scrollbarMinSize: 10
        }
    }

    static get htmlAttributes() {
        return {
            autoHide: 'data-simplebar-autohide',
            forceEnabled: 'data-simplebar-force-enabled',
            scrollbarMinSize: 'data-simplebar-scrollbar-min-size'
        }
    }

    static initHtmlApi() {
        this.initDOMLoadedElements = this.initDOMLoadedElements.bind(this);

        // MutationObserver is IE11+
        if (typeof MutationObserver !== 'undefined') {
            // Mutation observer to observe dynamically added elements
            this.globalObserver = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    Array.from(mutation.addedNodes).forEach(addedNode => {
                        if (addedNode.nodeType === 1) {
                            if (addedNode.SimpleBar) return;

                            if (addedNode.hasAttribute('data-simplebar')) {
                                new SimpleBar(addedNode, SimpleBar.getElOptions(addedNode));
                            } else {
                                Array.from(addedNode.querySelectorAll('[data-simplebar]')).forEach(el => {
                                    new SimpleBar(el, SimpleBar.getElOptions(el));
                                });
                            }
                        }
                    });

                    Array.from(mutation.removedNodes).forEach(removedNode => {
                        if (removedNode.nodeType === 1) {
                            if (removedNode.hasAttribute('data-simplebar')) {
                                removedNode.SimpleBar && removedNode.SimpleBar.unMount();
                            } else {
                                Array.from(removedNode.querySelectorAll('[data-simplebar]')).forEach(el => {
                                    el.SimpleBar && el.SimpleBar.unMount();
                                });
                            }
                        }
                    });
                });
            });

            this.globalObserver.observe(document, { childList: true, subtree: true });
        }

        // Taken from jQuery `ready` function
        // Instantiate elements already present on the page
        if (document.readyState === 'complete' ||
                (document.readyState !== 'loading' && !document.documentElement.doScroll)) {
            // Handle it asynchronously to allow scripts the opportunity to delay init
            window.setTimeout(this.initDOMLoadedElements.bind(this));
        } else {
            document.addEventListener('DOMContentLoaded', this.initDOMLoadedElements);
            window.addEventListener('load', this.initDOMLoadedElements);
        }
    }

    // Helper function to retrieve options from element attributes
    static getElOptions(el) {
        const options = Object.keys(SimpleBar.htmlAttributes).reduce((acc, obj) => {
            const attribute = SimpleBar.htmlAttributes[obj];
            if (el.hasAttribute(attribute)) {
                acc[obj] = JSON.parse(el.getAttribute(attribute) || true);
            }
            return acc;
        }, {});

        return options;
    }

    static removeObserver() {
        this.globalObserver.disconnect();
    }

    static initDOMLoadedElements() {
        document.removeEventListener('DOMContentLoaded', this.initDOMLoadedElements);
        window.removeEventListener('load', this.initDOMLoadedElements);

        Array.from(document.querySelectorAll('[data-simplebar]')).forEach(el => {
            if (!el.SimpleBar)
                new SimpleBar(el, SimpleBar.getElOptions(el));
        });
    }

    init() {
        // Save a reference to the instance, so we know this DOM node has already been instancied
        this.el.SimpleBar = this;

        if (!this.enabled) {
            return;
        }

        this.initDOM();

        this.scrollContentEl = this.el.querySelector(`.${this.classNames.scrollContent}`);
        this.contentEl = this.el.querySelector(`.${this.classNames.content}`);

        this.trackX = this.el.querySelector(`.${this.classNames.track}.horizontal`);
        this.trackY = this.el.querySelector(`.${this.classNames.track}.vertical`);

        this.scrollbarX = this.trackX.querySelector(`.${this.classNames.scrollbar}`);
        this.scrollbarY = this.trackY.querySelector(`.${this.classNames.scrollbar}`);

        this.scrollContentEl.style.marginRight = `-${this.offsetSize}px`;
        this.scrollContentEl.style.paddingRight = `${this.offsetSize}px`;
        this.scrollContentEl.style.marginBottom = `-${this.offsetSize}px`;
        this.contentEl.style.paddingBottom = `${this.offsetSize}px`;

        if (this.enabled && this.scrollbarWidth !== 0) {
            this.scrollContentEl.style.marginBottom = `-${this.offsetSize*2}px`;
            this.contentEl.style.marginRight = `-${this.offsetSize}px`;
        }

        // Calculate content size
        this.recalculate();

        this.initListeners();
    }

    initDOM() {
        // Prepare DOM
        if (this.options.wrapContent) {
            this.scrollContentEl = document.createElement('div');
            this.contentEl = document.createElement('div');

            this.scrollContentEl.classList.add(this.classNames.scrollContent);
            this.contentEl.classList.add(this.classNames.content);

            while (this.el.firstChild)
                this.contentEl.appendChild(this.el.firstChild)

            this.scrollContentEl.appendChild(this.contentEl);
            this.el.appendChild(this.scrollContentEl);
        }

        const track = document.createElement('div');
        const scrollbar = document.createElement('div');

        track.classList.add(this.classNames.track);
        scrollbar.classList.add(this.classNames.scrollbar);

        track.appendChild(scrollbar);

        this.trackX = track.cloneNode(true);
        this.trackX.classList.add('horizontal');

        this.trackY = track.cloneNode(true);
        this.trackY.classList.add('vertical');

        this.el.insertBefore(this.trackX, this.el.firstChild);
        this.el.insertBefore(this.trackY, this.el.firstChild);
        this.el.setAttribute('data-simplebar', 'init');
    }

    initListeners() {
        // Event listeners
        if (this.options.autoHide) {
            this.el.addEventListener('mouseenter', this.onMouseEnter);
        }

        this.scrollbarX.addEventListener('mousedown', (e) => this.onDrag(e, 'x'));
        this.scrollbarY.addEventListener('mousedown', (e) => this.onDrag(e, 'y'));

        this.scrollContentEl.addEventListener('scroll', this.onScrollY);
        this.contentEl.addEventListener('scroll', this.onScrollX);

        // MutationObserver is IE11+
        if (typeof MutationObserver !== 'undefined') {
            // create an observer instance
            this.mutationObserver = new MutationObserver(mutations => {
                mutations.forEach(mutation => {
                    if (this.isChildNode(mutation.target) || mutation.addedNodes.length) {
                        this.recalculate();
                    }
                });
            });

            // pass in the target node, as well as the observer options
            this.mutationObserver.observe(this.el, { attributes: true, childList: true, characterData: true, subtree: true });
        }

        this.resizeObserver = new ResizeObserver(this.recalculate.bind(this));
        this.resizeObserver.observe(this.el);
    }

    removeListeners() {
        if (!this.enabled) {
            return;
        }

        // Event listeners
        if (this.options.autoHide) {
            this.el.removeEventListener('mouseenter', this.onMouseEnter);
        }

        this.scrollbarX.removeEventListener('mousedown', (e) => this.onDrag(e, 'x'));
        this.scrollbarY.removeEventListener('mousedown', (e) => this.onDrag(e, 'y'));

        this.scrollContentEl.removeEventListener('scroll', this.onScrollY);
        this.contentEl.removeEventListener('scroll', this.onScrollX);

        this.mutationObserver.disconnect();
        this.resizeObserver.disconnect();
    }

    /**
     * on scrollbar handle drag
     */
    onDrag(e, axis = 'y') {
        // Preventing the event's default action stops text being
        // selectable during the drag.
        e.preventDefault();

        const scrollbar = axis === 'y' ? this.scrollbarY : this.scrollbarX;

        // Measure how far the user's mouse is from the top of the scrollbar drag handle.
        const eventOffset = axis === 'y' ? e.pageY : e.pageX;

        this.dragOffset[axis] = eventOffset - scrollbar.getBoundingClientRect()[this.offsetAttr[axis]];
        this.currentAxis = axis;

        document.addEventListener('mousemove', this.drag);
        document.addEventListener('mouseup', this.onEndDrag);
    }


    /**
     * Drag scrollbar handle
     */
    drag(e) {
        let eventOffset, track, scrollEl;

        e.preventDefault();

        if (this.currentAxis === 'y') {
            eventOffset = e.pageY;
            track = this.trackY;
            scrollEl = this.scrollContentEl;
        } else {
            eventOffset = e.pageX;
            track = this.trackX;
            scrollEl = this.contentEl;
        }

        // Calculate how far the user's mouse is from the top/left of the scrollbar (minus the dragOffset).
        let dragPos = eventOffset - track.getBoundingClientRect()[this.offsetAttr[this.currentAxis]] - this.dragOffset[this.currentAxis];

        // Convert the mouse position into a percentage of the scrollbar height/width.
        let dragPerc = dragPos / track[this.sizeAttr[this.currentAxis]];

        // Scroll the content by the same percentage.
        let scrollPos = dragPerc * this.contentEl[this.scrollSizeAttr[this.currentAxis]];

        scrollEl[this.scrollOffsetAttr[this.currentAxis]] = scrollPos;
    }


    /**
     * End scroll handle drag
     */
    onEndDrag() {
        document.removeEventListener('mousemove', this.drag);
        document.removeEventListener('mouseup', this.onEndDrag);
    }


    /**
     * Resize scrollbar
     */
    resizeScrollbar(axis = 'y') {
        let track;
        let scrollbar;
        let scrollOffset;
        let contentSize;

        if (axis === 'x') {
            track = this.trackX;
            scrollbar = this.scrollbarX;
            scrollOffset = this.contentEl[this.scrollOffsetAttr[axis]]; // Either scrollTop() or scrollLeft().
            contentSize = this.contentEl[this.scrollSizeAttr[axis]];
        } else { // 'y'
            track = this.trackY;
            scrollbar = this.scrollbarY;
            scrollOffset = this.scrollContentEl[this.scrollOffsetAttr[axis]]; // Either scrollTop() or scrollLeft().
            contentSize = this.contentEl[this.scrollSizeAttr[axis]] - 15;
        }

        let scrollbarSize   = track[this.sizeAttr[axis]];
        let scrollbarRatio  = scrollbarSize / contentSize;
        let scrollPourcent  = scrollOffset / (contentSize - scrollbarSize);
            // Calculate new height/position of drag handle.
            // Offset of 2px allows for a small top/bottom or left/right margin around handle.
        let handleSize      = Math.max(~~(scrollbarRatio * (scrollbarSize - 2)) - 2, this.options.scrollbarMinSize);
        let handleOffset    = ~~((scrollbarSize - 4 - handleSize) * scrollPourcent + 2);

        // Set isVisible to false if scrollbar is not necessary (content is shorter than wrapper)
        this.isVisible[axis] = scrollbarSize < contentSize

        if (this.isVisible[axis]) {
            track.style.visibility = 'visible';

            if (axis === 'x') {
                scrollbar.style.left = `${handleOffset}px`;
                scrollbar.style.width = `${handleSize}px`;
            } else {
                scrollbar.style.top = `${handleOffset}px`;
                scrollbar.style.height = `${handleSize}px`;
            }
        } else {
            track.style.visibility = 'hidden';
        }
    }


    /**
     * On scroll event handling
     */
    onScrollX() {
        this.flashScrollbar('x');
    }

    onScrollY() {
        this.flashScrollbar('y');
    }


    /**
     * On mouseenter event handling
     */
    onMouseEnter() {
        this.flashScrollbar('x');
        this.flashScrollbar('y');
    }


    /**
     * Flash scrollbar visibility
     */
    flashScrollbar(axis = 'y') {
        this.resizeScrollbar(axis);
        this.showScrollbar(axis);
    }


    /**
     * Show scrollbar
     */
    showScrollbar(axis = 'y') {
        if (!this.isVisible[axis]) {
            return
        }

        if (axis === 'x') {
            this.scrollbarX.classList.add('visible');
        } else {
            this.scrollbarY.classList.add('visible');
        }

        if (!this.options.autoHide) {
            return
        }
        if(typeof this.flashTimeout === 'number') {
            window.clearTimeout(this.flashTimeout);
        }

        this.flashTimeout = window.setTimeout(this.hideScrollbar.bind(this), 1000);
    }


    /**
     * Hide Scrollbar
     */
    hideScrollbar() {
        this.scrollbarX.classList.remove('visible');
        this.scrollbarY.classList.remove('visible');

        if(typeof this.flashTimeout === 'number') {
            window.clearTimeout(this.flashTimeout);
        }
    }


    /**
     * Recalculate scrollbar
     */
    recalculate() {
        if (!this.enabled) return;

        this.resizeScrollbar('x');
        this.resizeScrollbar('y');

        if (!this.options.autoHide) {
            this.showScrollbar('x');
            this.showScrollbar('y');
        }
    }


    /**
     * Getter for original scrolling element
     */
    getScrollElement() {
        return this.scrollContentEl;
    }


    /**
     * Getter for content element
     */
    getContentElement() {
        return this.contentEl;
    }

    /**
     * UnMount mutation observer and delete SimpleBar instance from DOM element
     */
    unMount() {
        this.removeListeners();
        this.el.SimpleBar = null;
    }

    /**
     * Recursively walks up the parent nodes looking for this.el
     */
    isChildNode(el) {
        if (el === null) return false;
        if (el === this.el) return true;

        return this.isChildNode(el.parentNode);
    }
}

/**
 * HTML API
 */
SimpleBar.initHtmlApi();