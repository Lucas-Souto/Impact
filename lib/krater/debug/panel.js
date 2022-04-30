import KG from '../krater.js';

class DebugPanel
{
	active = false;
	container = null;
	options = [];
	panels = [];
	label = '';
	name = '';
	
	
	constructor(name, label)
    {
		this.name = name;
		this.label = label;
		this.container = KG.$new('div');
		this.container.className = 'ig_debug_panel ' + this.name;
	}
	
	toggle(active)
    {
		this.active = active;
		this.container.style.display = active ? 'block' : 'none';
	}
	
	addPanel(panel)
    {
		this.panels.push(panel);
		this.container.appendChild(panel.container);
	}
	
	addOption(option)
    {
		this.options.push(option);
		this.container.appendChild(option.container);
	}
	
	ready() {}
	beforeRun() {}
	afterRun() {}
}

class DebugOption
{
	name = '';
	labelName = '';
	className = 'ig_debug_option';
	label = null;
	mark = null;
	container = null;
	active = false;
	
	colors =
    {
		enabled: '#fff',
		disabled: '#444'
	};
	
	constructor(name, object, property)
    {
		this.name = name;
		this.object = object;
		this.property = property;
		
		this.active = this.object[this.property];
		
		this.container = KG.$new('div');
		this.container.className = 'ig_debug_option';
		
		this.label = KG.$new('span');
		this.label.className = 'ig_debug_label';
		this.label.textContent = this.name;
		
		this.mark = KG.$new('span');
		this.mark.className = 'ig_debug_label_mark';
		
		this.container.appendChild(this.mark);
		this.container.appendChild(this.label);
		this.container.addEventListener('click', this.click.bind(this), false);
		
		this.setLabel();
	}
	
	setLabel()
    {
		this.mark.style.backgroundColor = this.active ? this.colors.enabled : this.colors.disabled;
	}
	
	click(ev)
    {
		this.active = !this.active;
		this.object[this.property] = this.active;
		this.setLabel();
		
		ev.stopPropagation();
		ev.preventDefault();
        
		return false;
	}
}

export { DebugPanel, DebugOption }

export default DebugPanel;