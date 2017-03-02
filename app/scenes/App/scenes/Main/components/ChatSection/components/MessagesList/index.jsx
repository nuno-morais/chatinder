import Inferno from 'inferno'
import Component from 'inferno-component'
import {observer} from 'inferno-mobx'
import {action, observable, computed, reaction} from 'mobx'
import Promise from 'bluebird'
import MessagesGroup from './components/MessagesGroup'
import linkref from 'linkref'
import Waypoint from 'react-waypoint'
import styled from 'styled-components'
import {normalizeScrollbar} from 'app/styles'
import compose from 'recompose/compose'
import muiThemeable from 'material-ui/styles/muiThemeable'
import DateGroup from './components/DateGroup'
import SimpleBar from 'simplebar'


const OuterWrapper = styled.div`
	height: 100%;
	max-height: 100%;
	overflow-y: hidden;
	overflow-x: hidden;
	position: relative;
	display: inline-block;
`;

const InnerWrapper = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	min-height: 100%;
	position: relative;
	margin-bottom: 10px;
`;

const LoadingMessage = styled.div`
	text-align: center;
	margin-top: 10px;
	color: ${props => props.theme.palette.secondaryTextColor};
	font-size: 14px;
`;

const HorizontalScroll = styled.div`
	visibility: hidden;
	position: relative;
`;

const Anchor = styled.div`
	height: 0;
`;

class MessagesList extends Component {
	disposer;
	interval;
	timeout;
	shouldScrollBottom;
	forceScrollBottom = false;
	shouldRestoreScrollPosition;
	cachedOffsetHeight;
	nodeScrollTop;
	nodeScrollHeight;
	@observable initialRender = true;
	@observable startingFrom = 0;
	@observable keepDown = true;
	@observable loadMore = false;

	@action setRenderFlag = (flag) => {
		this.initialRender = flag
	};

	@action setStartingFrom = ({initial}) => {
		const length = this.rawMessages.length;
		const startingIndex = initial ? length : this.startingFrom;


		if (startingIndex === 0) {
			return
		}

		let newIndex = startingIndex - 17;
		newIndex = (newIndex < 0) ? 0 : newIndex;

		if (!initial) {
			const {scrollTop, scrollHeight} = this.refs.scrollContent;
			this.nodeScrollTop = scrollTop;
			this.nodeScrollHeight = scrollHeight;
			this.shouldRestoreScrollPosition = true;
		} else if (!this.initialRender) {
			this.forceScrollBottom = true;
			this.shouldRestoreScrollPosition = false;
		}
		this.startingFrom = newIndex;
	};

	@computed get matchId() {
		return this.props.store.currentView.params.matchId
	}

	@computed get currentMatch() {
		return this.props.store.matches.get(this.matchId)
	}

	@computed get rawMessages() {
		return this.currentMatch.messages
	}

	@computed get messagesExist() {
		return this.rawMessages.length !== 0;
	}

	get filteredMessages() {
		return this.rawMessages.slice(this.startingFrom)
	}

	get messageDateGroups() {
		let dateGroups = [];
		let tempGroup = [];
		
		this.filteredMessages.forEach(message => {
			if (tempGroup.length !== 0) {
				if (tempGroup[0].sentDay === message.sentDay) {
					tempGroup.push(message)
				} else {
					dateGroups.push(tempGroup);
					tempGroup = [message];
				}
			} else {
				tempGroup.push(message)
			}
		});
		dateGroups.push(tempGroup);

		return dateGroups
	}

	get messageGroups() {
		return this.messageDateGroups.map(dateGroup => {
			let messageGroups = [];
			let tempGroup = [];

			dateGroup.forEach(message => {
				if (tempGroup.length !== 0) {
					if (tempGroup[0].messageGroup === message.messageGroup) {
						tempGroup.push(message)
					} else {
						messageGroups.push(tempGroup);
						tempGroup = [message];
					}
				} else {
					tempGroup.push(message)
				}
			});
			messageGroups.push(tempGroup);

			return messageGroups
		})
	}

	@computed get messageNodes() {
		return this.messageGroups.map(dateGroup => (
			<DateGroup 
				day={dateGroup[0][0].sentDay}
				timestamp={dateGroup[0][0].timestamp}
				key={`${this.matchId}-${dateGroup[0][0].timestamp}`}
			>
				{dateGroup.map(messagesGroup => (
					<MessagesGroup
						messagesGroup={messagesGroup}
						currentMatch={this.currentMatch}
						key={messagesGroup[0].messageGroup}
					/>
				))}
			</DateGroup>
		))
	}

	showMoreMessages = () => {
		if (!this.initialRender) {
			this.setStartingFrom({initial: false});
		}
	};

	scrollToBottom = () => {
		this.refs.anchor.scrollIntoView({block: 'end', behaviour: 'smooth'});
	};

	@action stickBottom = () => {
		this.keepDown = true;
	};

	@action unstickBottom = () => {
		const node = this.refs.scrollContent;
		if (this.keepDown && (node.scrollTop + node.offsetHeight !== node.scrollHeight)) {
			this.keepDown = false;
		}
	};

	@action triggerLoad = () => {
		this.loadMore = true;
	};

	@action untriggerLoad = () => {
		this.loadMore = false;
	};

	constructor(props) {
		super(props);
		this.setStartingFrom({initial: true});
	}

	componentDidMount() {
		const node = this.refs.container;
		new SimpleBar(node, {wrapContent: false, forceEnabled: true});
		const scrollNode = this.refs.scrollContent;

		this.scrollToBottom();
		this.setRenderFlag(false);

		this.disposer = reaction(
			() => this.matchId,
			() => {
				this.setStartingFrom({initial: true});
				this.untriggerLoad();
				this.stickBottom();
			}
		);

		this.cachedOffsetHeight = node.offsetHeight;

		this.interval = setInterval(() => {
			if (node.offsetHeight !== this.cachedOffsetHeight) {
				node.SimpleBar.recalculate();
				this.cachedOffsetHeight = node.offsetHeight;
			}

			if (this.keepDown && (scrollNode.scrollTop + scrollNode.offsetHeight !== scrollNode.scrollHeight)) {
				this.scrollToBottom();
			}

			if (this.loadMore && !this.initialRender) {
				if (!this.timeout) {
					this.timeout = setTimeout(() => {
						this.setStartingFrom({initial: false});
						this.timeout = null;
					}, 400);
				}
			}
		}, 100);
	}

	componentDidUpdate() {
		const node = this.refs.scrollContent;
		if (this.forceScrollBottom) {
			this.forceScrollBottom = false;
			this.scrollToBottom();
		} else if (this.shouldRestoreScrollPosition) {
			this.shouldRestoreScrollPosition = false;
			node.scrollTop = node.scrollHeight - this.nodeScrollHeight + this.nodeScrollTop;
		}
	}

	componentWillUnmount() {
		this.disposer();
		this.disposer = null;
		clearInterval(this.interval);
		this.interval = null;
		clearTimeout(this.timeout);
		this.timeout = null;
	}

	renderLoadingMessage = () => {
		if (this.messagesExist) {
			return (
				<LoadingMessage key="loadingMessage" theme={this.props.muiTheme}>
					{this.startingFrom !== 0 && "Loading messages…"}
				</LoadingMessage>
			)
		} else {
			return null;
		}
	}

	render() {
		const nodes = this.messagesExist ? this.messageNodes : null;

		return (
			<OuterWrapper innerRef={linkref(this, 'container')} id="tst">
				<div className="simplebar-track vertical">
					<div className="simplebar-scrollbar"></div>
				</div>
				<HorizontalScroll>
					<div className="simplebar-track horizontal">
						<div className="simplebar-scrollbar"></div>
					</div>
				</HorizontalScroll>
				<div className="simplebar-scroll-content" ref={linkref(this, 'scrollContent')} onScroll={this.unstickBottom} >
					<div className="simplebar-content">
						{this.renderLoadingMessage()}
						{	
							this.messagesExist && 
							<Waypoint
								onEnter={this.triggerLoad}
								onLeave={this.untriggerLoad}
								topOffset='-200px'
								scrollableAncestor={this.refs.scrollContent}
							/>
						}
						<InnerWrapper hasKeyedChildren>
							{this.messagesExist && this.messageNodes}
						</InnerWrapper>
						<Waypoint onEnter={this.stickBottom} scrollableAncestor={this.refs.scrollContent}/>
						<Anchor innerRef={linkref(this, 'anchor')}/>
					</div>
				</div>
			</OuterWrapper>
		)
	}
}


export default compose(
	muiThemeable(),
	observer(['store'])
)(MessagesList)