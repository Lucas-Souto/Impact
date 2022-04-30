import KG from '../krater.js';
import * as Menu from './menu.js';
import DebugableEntity from './entities-panel.js';
import DebugPanel from './panel.js';
import DebugGraphPanel from './graph-panel.js';
import DebugMapsPanel from './maps-panel.js';

KG.debug.addPanel(//Painel exclusivo do DebugableEntity
{
	type: DebugPanel,
	name: 'entities',
	label: 'Entities',
	options:
	[
		{
			name: 'Checks & Collisions',
			object: DebugableEntity,
			property: '_debugEnableChecks'
		},
		{
			name: 'Show Collision Boxes',
			object: DebugableEntity,
			property: '_debugShowBoxes'
		},
		{
			name: 'Show Velocities',
			object: DebugableEntity,
			property: '_debugShowVelocities'
		},
		{
			name: 'Show Names & Targets',
			object: DebugableEntity,
			property: '_debugShowNames'
		}
	]
});