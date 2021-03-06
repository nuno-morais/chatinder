import * as $ from 'jquery'
import emojione from './emojione'
import * as packageJSON from 'emojione/package.json'

function shimJQueryPlugins() {
	global.jQuery = $
	global.emojione = emojione
	global.emojioneVersion = packageJSON.version
	require('emojionearea')
	return global.jQuery
}

export default shimJQueryPlugins()
