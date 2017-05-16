import React, { Component } from 'react'
import { inject, observer } from 'mobx-react'
import CircularProgress from 'material-ui/CircularProgress'
import muiThemeable from 'material-ui/styles/muiThemeable'
import compose from 'recompose/compose'
import styled from 'styled-components'

const OuterWrapper = styled.div`
	height: 100vh;
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	transition: all 450ms cubic-bezier(0.23, 1, 0.32, 1) 0ms;
`

const TitleWrapper = styled.h2`
	color: ${props => props.theme.palette.textColor}
`

const ProgressWrapper = styled.div`
	width: 100px;
	margin: auto;
`

@inject('view')
@muiThemeable()
@observer
class LoadingScreen extends Component {
	render() {
		const { muiTheme, title, view } = this.props

		return (
			<OuterWrapper>
				<div>
					<TitleWrapper theme={muiTheme}>
						{title || view.params.title}
					</TitleWrapper>
					<ProgressWrapper>
						<CircularProgress size={100} thickness={3} />
					</ProgressWrapper>
				</div>
			</OuterWrapper>
		)
	}
}

export default LoadingScreen
