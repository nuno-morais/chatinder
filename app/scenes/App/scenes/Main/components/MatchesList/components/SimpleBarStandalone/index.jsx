// this is a partial rewrite of SimpleBar
import Component from 'inferno-component'
import {observer} from 'inferno-mobx'
import {observable, action} from 'mobx'
import styled from 'styled-components'
import linkref from 'linkref'


const Track = styled.div`
    height: ${props => props.height}px;
`;

const ScrollBar = styled.div`
    height: ${props => props.height}px;
    top: ${props => props.offset}px;
`;

class SimpleBarStandalone extends Component {
    flashTimeout;
    dragOffset;
	@observable visible = false;

    get fitsInScreen() {
        return this.props.clientHeight >= this.props.scrollHeight
    }

	@action showScrollbar = () => {
		this.visible = true;
        this.clearFlashTimeout();

        this.flashTimeout = setTimeout(this.hideScrollbar, 1000);
	}

	@action hideScrollbar = () => {
		this.visible = false;
		this.clearFlashTimeout();
	}

    constructor(props) {
        super(props);
        this.props.componentRef(this);
    }

    componentWillUnmount() {
        this.clearFlashTimeout();
    }

    clearFlashTimeout = () => {
        if(typeof this.flashTimeout === 'number') {
            clearTimeout(this.flashTimeout);
        }
    }

    startDrag = (event) => {
        event.preventDefault();
        
        this.dragOffset = event.pageY - this.refs.scrollbar.getBoundingClientRect().top;
        document.addEventListener('mousemove', this.drag);
        document.addEventListener('mouseup', this.endDrag);
    }

    drag = (event) => {
        event.preventDefault();

        const dragPos = event.pageY - this.refs.track.getBoundingClientRect().top - this.dragOffset;
        const dragPerc = Math.max(Math.min(dragPos / this.props.clientHeight, 1), 0);
        const scrollPos = dragPerc * (this.props.scrollHeight - this.props.clientHeight);

        this.props.onScroll({
            clientHeight: this.props.clientHeight,
            scrollHeight: this.props.scrollHeight,
            scrollTop: scrollPos
        });
    }

    endDrag = () => {
        document.removeEventListener('mousemove', this.drag);
        document.removeEventListener('mouseup', this.endDrag);
    }

    render() {
        const {scrollTop, clientHeight, scrollHeight, visible} = this.props;

        const scrollbarRatio = clientHeight / scrollHeight;
        const scrollPercent =scrollTop / (scrollHeight - clientHeight);
        // Calculate new height/position of drag handle.
        // Offset of 2px allows for a small top/bottom or left/right margin around handle.
        const height = Math.max(Math.floor(scrollbarRatio * (clientHeight - 2)) - 2, 10);
        const offset = (clientHeight - 4 - height) * scrollPercent + 2;

        return (
            <Track className='simplebar-track vertical' innerRef={linkref(this, 'track')} height={clientHeight}>
                <ScrollBar 
                    className={`simplebar-scrollbar ${this.visible && !this.fitsInScreen ? 'visible' : null}`} 
                    innerRef={linkref(this, 'scrollbar')}
                    height={height}
                    offset={offset}
                    onMouseDown={this.startDrag}
                />
            </Track>
        )
    }
}

export default observer(SimpleBarStandalone)