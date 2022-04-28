import IG from './impact';

class SoundManager
{
	clips = {};
	volume = 1;
	format = null;
	
	constructor()
	{
		// Quick sanity check if the Browser supports the Audio tag
		if(!Sound.enabled || !window.Audio)
		{
			Sound.enabled = false;

			return;
		}
		
		// Probe sound formats and determine the file extension to load
		const probe = new Audio();

		for(let i = 0; i < Sound.use.length; i++)
		{
			let format = ig.Sound.use[i];

			if(probe.canPlayType(format.mime))
			{
				this.format = format;

				break;
			}
		}
		
		// No compatible format found? -> Disable sound
		if(!this.format) Sound.enabled = false;

		// Create WebAudio Context
		if(Sound.enabled && Sound.useWebAudio)
		{
			this.audioContext = new AudioContext();
			this.boundWebAudioUnlock = this.unlockWebAudio.bind(this);

			IG.system.canvas.addEventListener('touchstart', this.boundWebAudioUnlock, false);
			IG.system.canvas.addEventListener('mousedown', this.boundWebAudioUnlock, false);
		}
	}
	
	unlockWebAudio()
	{
		IG.system.canvas.removeEventListener('touchstart', this.boundWebAudioUnlock, false);
		IG.system.canvas.removeEventListener('mousedown', this.boundWebAudioUnlock, false);
		
		// create empty buffer
		const buffer = this.audioContext.createBuffer(1, 1, 22050);
		const source = this.audioContext.createBufferSource();
		source.buffer = buffer;

		source.connect(this.audioContext.destination);
		source.start(0);
	}

	load(path, multiChannel, loadCallback)
	{
		if(multiChannel && Sound.useWebAudio) return this.loadWebAudio(path, multiChannel, loadCallback);// Requested as Multichannel and we're using WebAudio?
		else return this.loadHTML5Audio(path, multiChannel, loadCallback);// Oldschool HTML5 Audio - always used for Music
	}

	loadWebAudio(path, multiChannel, loadCallback)
	{
		// Path to the soundfile with the right extension (.ogg or .mp3)
		const realPath = IG.prefix + path.replace(/[^\.]+$/, this.format.ext) + IG.nocache;

		if(this.clips[path]) return this.clips[path];

		const audioSource = new WebAudioSource();
		this.clips[path] = audioSource;

		const request = new XMLHttpRequest();
		request.open('GET', realPath, true);
		request.responseType = 'arraybuffer';

		const that = this;
		request.onload = function(ev)
		{
			that.audioContext.decodeAudioData(request.response, 
				function(buffer)
				{
					audioSource.buffer = buffer;

					if(loadCallback) loadCallback(path, true, ev);
				}, 
				function(ev)
				{
					if(loadCallback) loadCallback(path, false, ev);
				}
			);
		};
		request.onerror = function(ev)
		{
			if( loadCallback ) {
				loadCallback( path, false, ev );
			}
		};
		request.send();

		return audioSource;
	}
	
	loadHTML5Audio(path, multiChannel, loadCallback)
	{
		
		// Path to the soundfile with the right extension (.ogg or .mp3)
		const realPath = IG.prefix + path.replace(/[^\.]+$/, this.format.ext) + IG.nocache;
		
		// Sound file already loaded?
		if(this.clips[path])
		{
			// Loaded as WebAudio, but now requested as HTML5 Audio? Probably Music?
			if(this.clips[path] instanceof WebAudioSource) return this.clips[path];
			
			// Only loaded as single channel and now requested as multichannel?
			if(multiChannel && this.clips[path].length < Sound.channels)
			{
				for(let i = this.clips[path].length; i < Sound.channels; i++)
				{
					const a = new Audio(realPath);

					a.load();
					this.clips[path].push(a);
				}
			}

			return this.clips[path][0];
		}
		
		const clip = new Audio(realPath);

		if(loadCallback)
		{
			// The canplaythrough event is dispatched when the browser determines
			// that the sound can be played without interuption, provided the
			// download rate doesn't change.
			// Mobile browsers stubbornly refuse to preload HTML5, so we simply
			// ignore the canplaythrough event and immediately "fake" a successful
			// load callback
			if(IG.ua.mobile) setTimeout(() => loadCallback(path, true, null), 0);
			else
			{
				clip.addEventListener('canplaythrough', function cb(ev)
				{
					clip.removeEventListener('canplaythrough', cb, false);
					loadCallback(path, true, ev);
				}, false);
				clip.addEventListener( 'error', (ev) => loadCallback(path, false, ev), false);
			}
		}

		clip.preload = 'auto';

		clip.load();
		
		this.clips[path] = [clip];

		if(multiChannel)
		{
			for(let i = 1; i < Sound.channels; i++)
			{
				let a = new Audio(realPath);

				a.load();

				this.clips[path].push(a);
			}
		}
		
		return clip;
	}
	
	get(path)
	{
		// Find and return a channel that is not currently playing	
		const channels = this.clips[path];

		// Is this a WebAudio source? We only ever have one for each Sound
		if(channels && channels instanceof WebAudioSource) return channels;

		// Oldschool HTML5 Audio - find a channel that's not currently 
		// playing or, if all are playing, rewind one
		for(let i = 0, clip; clip = channels[i++];)
		{
			if(clip.paused || clip.ended )
			{
				if(clip.ended) clip.currentTime = 0;

				return clip;
			}
		}
		
		// Still here? Pause and rewind the first channel
		channels[0].pause();

		channels[0].currentTime = 0;

		return channels[0];
	}
}

class Music
{
	tracks = [];
	namedTracks = {};
	currentTrack = null;
	currentIndex = 0;
	random = false;
	
	_volume = 1;
	_loop = false;
	_fadeInterval = 0;
	_fadeTimer = null;
	_endedCallbackBound = null;
	
	constructor()
	{
		this._endedCallbackBound = this._endedCallback.bind(this);
		
		Object.defineProperty(this, "volume",
		{ 
			get: this.getVolume.bind(this),
			set: this.setVolume.bind(this)
		});
		
		Object.defineProperty(this, "loop",
		{ 
			get: this.getLooping.bind(this),
			set: this.setLooping.bind(this)
		});
	}
	
	add(music, name)
	{
		if(!Sound.enabled) return;
		
		const path = music instanceof Sound ? music.path : music;
		const track = IG.soundManager.load(path, false);

		// Did we get a WebAudio Source? This is suboptimal; Music should be loaded
		// as HTML5 Audio so it can be streamed
		if(track instanceof WebAudioSource)
		{
			// Since this error will likely occur at game start, we stop the game
			// to not produce any more errors.
			IG.system.stopRunLoop();
			throw(
				`Sound '${path}' loaded as Multichannel but used for Music. ` +
				"Set the multiChannel param to false when loading, e.g.: new Sound(path, false)"
			);
		}

		track.loop = this._loop;
		track.volume = this._volume;

		track.addEventListener('ended', this._endedCallbackBound, false);
		this.tracks.push( track );
		
		if(name) this.namedTracks[name] = track;
		
		if(!this.currentTrack) this.currentTrack = track;
	}
	
	next()
	{
		if(!this.tracks.length) return;
		
		this.stop();

		this.currentIndex = this.random ? Math.floor(Math.random() * this.tracks.length) : (this.currentIndex + 1) % this.tracks.length;
		this.currentTrack = this.tracks[this.currentIndex];

		this.play();
	}
	
	pause()
	{
		if(!this.currentTrack) return;

		this.currentTrack.pause();
	}
	
	stop()
	{
		if(!this.currentTrack) return;

		this.currentTrack.pause();

		this.currentTrack.currentTime = 0;
	}
	
	play(name)
	{
		// If a name was provided, stop playing the current track (if any)
		// and play the named track
		if(name && this.namedTracks[name])
		{
			const newTrack = this.namedTracks[name];

			if(newTrack != this.currentTrack)
			{
				this.stop();

				this.currentTrack = newTrack;
			}
		}
		else if(!this.currentTrack) return;

		this.currentTrack.play();
	}
		
	getLooping()
	{
		return this._loop;
	}
	
	setLooping(l)
	{
		this._loop = l;

		for(let i in this.tracks) this.tracks[i].loop = l;
	}
	
	getVolume()
	{
		return this._volume;
	}
	
	setVolume(v)
	{
		this._volume = v.limit(0,1);

		for(let i in this.tracks) this.tracks[i].volume = this._volume;
	}
	
	fadeOut(time)
	{
		if(!this.currentTrack) return;
		
		clearInterval(this._fadeInterval);

		this._fadeTimer = new Timer(time);
		this._fadeInterval = setInterval(this._fadeStep.bind(this), 50);
	}
	
	_fadeStep()
	{
		const v = this._fadeTimer.delta().map(-this._fadeTimer.target, 0, 1, 0).limit(0, 1) * this._volume;
		
		if(v <= 0.01)
		{
			this.stop();

			this.currentTrack.volume = this._volume;

			clearInterval(this._fadeInterval);
		}
		else this.currentTrack.volume = v;
	}
	
	_endedCallback()
	{
		if(this._loop) this.play();
		else this.next();
	}
}

export class Sound
{
	path = '';
	volume = 1;
	currentClip = null;
	multiChannel = true;
	_loop = false;

	static FORMAT =
	{
		MP3: { ext: 'mp3', mime: 'audio/mpeg' },
		M4A: { ext: 'm4a', mime: 'audio/mp4; codecs=mp4a.40.2' },
		OGG: { ext: 'ogg', mime: 'audio/ogg; codecs=vorbis' },
		WEBM: { ext: 'webm', mime: 'audio/webm; codecs=vorbis' },
		CAF: { ext: 'caf', mime: 'audio/x-caf' }
	};
	static use = [Sound.FORMAT.OGG, Sound.FORMAT.MP3];
	static channels = 4;
	static enabled = true;
	static useWebAudio;
	
	constructor(path, multiChannel)
	{
		this.path = path;
		this.multiChannel = (multiChannel !== false);

		Object.defineProperty(this, "loop",
		{ 
			get: this.getLooping.bind(this),
			set: this.setLooping.bind(this)
		});
		
		this.load();
	}

	getLooping()
	{
		return this._loop;
	}

	setLooping(loop)
	{
		this._loop = loop;

		if(this.currentClip) this.currentClip.loop = loop;
	}
	
	load(loadCallback)
	{
		if(!Sound.enabled)
		{
			if(loadCallback) loadCallback(this.path, true);

			return;
		}
		
		if(IG.ready) IG.soundManager.load(this.path, this.multiChannel, loadCallback);
		else IG.addResource(this);
	}
	
	play()
	{
		if(!Sound.enabled) return;
		
		this.currentClip = IG.soundManager.get(this.path);
		this.currentClip.loop = this._loop;
		this.currentClip.volume = IG.soundManager.volume * this.volume;

		this.currentClip.play();
	}
	
	stop()
	{
		if(this.currentClip)
		{
			this.currentClip.pause();

			this.currentClip.currentTime = 0;
		}
	}
}

class WebAudioSource
{
	sources = [];
	gain = null;
	buffer = null;
	_loop = false;

	constructor()
	{
		this.gain = IG.soundManager.audioContext.createGain();
		this.gain.connect(IG.soundManager.audioContext.destination);

		Object.defineProperty(this, "loop",
		{ 
			get: this.getLooping.bind(this),
			set: this.setLooping.bind(this)
		});

		Object.defineProperty(this, "volume",
		{ 
			get: this.getVolume.bind(this),
			set: this.setVolume.bind(this)
		});
	}

	play()
	{
		if(!this.buffer) return;

		const source = IG.soundManager.audioContext.createBufferSource();
		source.buffer = this.buffer;

		source.connect(this.gain);

		source.loop = this._loop;

		// Add this new source to our sources array and remove it again
		// later when it has finished playing.
		const that = this;

		this.sources.push(source);

		source.onended = () => that.sources.erase(source);

		source.start(0);
	}

	pause()
	{
		for(let i = 0; i < this.sources.length; i++)
		{
			try
			{
				this.sources[i].stop();
			} catch(err){}
		}
	}

	getLooping()
	{
		return this._loop;
	}

	setLooping(loop)
	{
		this._loop = loop;

		for(let i = 0; i < this.sources.length; i++) this.sources[i].loop = loop;
	}

	getVolume()
	{
		return this.gain.gain.value;
	}

	setVolume(volume)
	{
		this.gain.gain.value = volume;
	}
}

IG.normalizeVendorAttribute(window, 'AudioContext');
Sound.useWebAudio = !!window.AudioContext;

export default SoundManager;