class SelectFileDropdown
{
	input = null;
	boundShow = null;
	boundHide = null;
	div = null;
	filelistPHP = '';
	filetype = '';
	
	constructor(elementId, filelistPHP, filetype)
	{
		this.filetype = filetype || '';
		this.filelistPHP = filelistPHP;
		this.input = $(elementId);
		this.boundHide = this.hide.bind(this);

		this.input.bind('focus', this.show.bind(this));
		
		this.div = $('<div/>', { 'class':'selectFileDialog' });

		this.input.after(this.div);
		this.div.bind('mousedown', this.noHide.bind(this));
		
		this.loadDir('');
	}
	
	loadDir(dir)
	{
		const path = this.filelistPHP + '?dir=' + encodeURIComponent(dir || '') + '&type=' + this.filetype;

		$.ajax(
		{
			url: path, 
			dataType: 'json',
			async: false,
			success: this.showFiles.bind(this)
		});
	}
	
	selectDir(event)
	{
		this.loadDir($(event.target).attr('href'));

		return false;
	}
	
	selectFile(event)
	{
		this.input.val($(event.target).attr('href'));
		this.input.blur();
		this.hide();

		return false;
	}
	
	showFiles(data)
	{
		this.div.empty();

		if(data.parent !== false)
		{
			const parentDir = $('<a/>', { 'class': 'dir', href: data.parent, html: '&hellip;parent directory' });

			parentDir.bind('click', this.selectDir.bind(this));
			this.div.append(parentDir);
		}

		for(let i = 0; i < data.dirs.length; i++)
		{
			const name = data.dirs[i].match(/[^\/]*$/)[0] + '/';
			const dir = $('<a/>', { 'class': 'dir', href: data.dirs[i], html: name, title: name });

			dir.bind('click', this.selectDir.bind(this));
			this.div.append(dir);
		}

		for(let i = 0; i < data.files.length; i++)
		{
			const name = data.files[i].match(/[^\/]*$/)[0];
			const file = $('<a/>', { 'class': 'file', href: data.files[i], html: name, title: name });

			file.bind('click', this.selectFile.bind(this));
			this.div.append(file);
		}
	}
	
	noHide(event)
	{
		event.stopPropagation();
	}
	
	show(event)
	{
		const inputPos = this.input.position();//this.input.getPosition(this.input.getOffsetParent());
		const inputHeight = parseInt(this.input.innerHeight()) + parseInt(this.input.css('margin-top'));
		const inputWidth = this.input.innerWidth();
		
		$(document).bind('mousedown', this.boundHide);
		this.div.css(
		{
			'top': inputPos.top + inputHeight + 1,
			'left': inputPos.left,
			'width': inputWidth
		}).slideDown(100);
	}
	
	hide()
	{
		$(document).unbind('mousedown', this.boundHide);
		this.div.slideUp(100);
	}
}

export default SelectFileDropdown;