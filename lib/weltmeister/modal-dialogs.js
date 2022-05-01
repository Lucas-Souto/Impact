import WM from './wm.js';
import SelectFileDropdown from './select-file-dropdown.js';

class ModalDialog
{
	onOk = null;
	onCancel = null;

	text = '';
	okText = '';
	cancelText = '';
	
	background = null;
	dialogBox = null;
	buttonDiv = null;
	
	constructor(text, okText, cancelText)
	{
		this.text = text;
		this.okText = okText || 'OK';
		this.cancelText = cancelText || 'Cancel';
	
		this.background = $('<div/>', { 'class':'modalDialogBackground' });
		this.dialogBox = $('<div/>', { 'class':'modalDialogBox' });

		this.background.append(this.dialogBox);
		$('body').append(this.background);
		
		//Init dialog
		this.buttonDiv = $('<div/>', { 'class': 'modalDialogButtons' });
		const okButton = $('<input/>', { 'type': 'button', 'class':'button', 'value': this.okText });
		const cancelButton = $('<input/>', { 'type': 'button', 'class':'button', 'value': this.cancelText });
		
		okButton.bind('click', this.clickOk.bind(this));
		cancelButton.bind('click', this.clickCancel.bind(this));
		
		this.buttonDiv.append(okButton).append(cancelButton);
		
		this.dialogBox.html('<div class="modalDialogText">' + this.text + '</div>');
		this.dialogBox.append(this.buttonDiv);
	}
	
	clickOk()
	{
		if(this.onOk) this.onOk(this);

		this.close();
	}
	
	clickCancel()
	{
		if(this.onCancel) this.onCancel(this);

		this.close();
	}
	
	open()
	{
		this.background.fadeIn(100);
	}
	
	close()
	{
		this.background.fadeOut(100);
	}
}

class ModalDialogPathSelect extends ModalDialog
{
	pathDropdown = null;
	pathInput = null;
	fileType = '';
	
	constructor(text, okText, type)
	{
		super(text, (okText || 'Select'));
		
		this.fileType = type || '';

		//Init dialog
		this.pathInput = $('<input/>', { 'type': 'text', 'class': 'modalDialogPath' });
		
		this.buttonDiv.before(this.pathInput);

		this.pathDropdown = new SelectFileDropdown(this.pathInput, WM.config.api.browse, this.fileType);
	}
	
	setPath(path)
	{
		const dir = path.replace(/\/[^\/]*$/, '');
		
		this.pathInput.val(path);
		this.pathDropdown.loadDir(dir);
	}
	
	clickOk()
	{
		if(this.onOk) this.onOk(this, this.pathInput.val());

		this.close();
	}
}

export { ModalDialog, ModalDialogPathSelect };

export default ModalDialog;