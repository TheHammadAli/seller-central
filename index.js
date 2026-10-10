/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { registerBackgroundPush } from './src/push';
import { name as appName } from './app.json';

// Background notifications are shown by the phone itself; this just has to be
// in place before the app starts.
registerBackgroundPush();

AppRegistry.registerComponent(appName, () => App);
