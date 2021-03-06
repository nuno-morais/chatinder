import 'roboto-fontface/css/roboto/roboto-fontface.css'
import 'font-awesome/css/font-awesome.min.css'
import 'react-virtualized/styles.css'
import 'simplebar/dist/simplebar.css'
import 'emojionearea/dist/emojionearea.min.css'
import 'react-image-gallery/styles/css/image-gallery.css'
import './app.global.css'

import * as React from 'react'
import * as ReactDOM from 'react-dom'

import { Provider } from 'mobx-react'
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider'
import { HashRouter as Router, Route } from 'react-router-dom'

import { useStrict } from 'mobx'
import * as TapPlugin from 'react-tap-event-plugin'
TapPlugin()

import configureTheme from './configureTheme'
import { configureStores } from './stores'

if (process.env.NODE_ENV === 'development') {
	global.Perf = require('react-addons-perf')
}

async function configureAndRender() {
	const container = document.getElementById('root')

	const theme = configureTheme()
	const stores = await configureStores()
	useStrict(true)

	function render() {
		const App = require('./scenes/App/index').default
		ReactDOM.render(
			<MuiThemeProvider muiTheme={theme}>
				<Provider {...stores}>
					<Router hashType="slash">
						<Route path="/" component={App} />
					</Router>
				</Provider>
			</MuiThemeProvider>,
			container,
			() => {}
		)
	}

	render()
	if (module.hot) {
		module.hot.accept(render)
	}
}

configureAndRender()
