import Font from '../krater/font.js';

class FontPlus extends Font
{
    maxChar = -1;

    #data = [];
    #_filteredText = '';

    //Enums
    static ORIGIN = 
    {
        TopLeft: 0, Top: 1, TopRight: 2,
        Left: 3, Center: 4, Right: 5,
        BottomLeft: 6, Bottom: 7, BottomRight: 8
    };

    static TEXTEFFECT =
    {
        None, Wave, Rotation, Pulsate, Scream, MovingHorizontal, MovingVertical
    };

    //Configuração de efeitos
    rotation = 0;
    layerDepth = 0;
    rotationAmount = 2;
    pulsateAmount = .01;
    waveSpeed = .05;
    waveAmplitude = .5;
    pulsateLimit = { x: .5, y: 1 }; 
    screamOffset = { x: 2, y: 2 }; 
    movingSpeed = { x: .05, y: .05 };
    movingAmplitude = { x: 4, y: 4 };

    //Confirgurações padrão
    color = null;
    origin = ORIGIN.Center;
    textEffect = TEXTEFFECT.None;
    
    //Variáveis dos efeitos
    #t = 0;
    #h = 0;
    #v = 0;
    #rotationEffect = 0;
    #scaling = 0;

    constructor(path, input)
    {
        super(path);

        if (typeof(input) === 'array') this.Data = input;
        else if (typeof(input) === 'string') this.Text = input;
        else if (input !== null) throw('String/array expected!');
    }

    get Data()
    {
        return this.#data;
    }

    set Data(data)
    {
        if (typeof(data) !== 'array') return;

        this.#data = data;
        this.filteredText = '';

        this.#t = 0;
        this.#h = 0;
        this.#v = 0;
        this.#rotationEffect = 0;
        this.scaling = 0;
        
        if (data !== null) this.data.forEach((block) => this.filteredText += block.text);
    }

    set Text(text)
    {
        if (typeof(text) !== 'string') return;

        this.#t = 0;
        this.#h = 0;
        this.#v = 0;
        this.#rotationEffect = 0;
        this.scaling = 0;
        
        const lines = text.split('\n');

        for (let i = 0; i < lines.length; i++)
        {
            const textSplit = lines[i].split('<');

            textSplit.forEach((splited) =>
            {
                if (splited.includes('color=') || splited.includes('font=') || splited.includes('origin=') || splited.includes('scale=') ||
                            splited.includes('rotation=') || splited.includes('textEffect=') || splited.includes('spriteEffect='))
                {
                    const blockArguments = splited.split('|');

                    blockArguments.forEach((argument) =>
                    {
                        const separation = argument.Split('>');
                        const arg = separation[0];

                        if (arg.includes('color=')) this.#data[i].color = arg.replace('color=', '');
                        else if (arg.includes('origin='))
                        {
                            const argOrigin = arg.replace('origin=', '');
                            this.#data[i].origin = typeof(argOrigin) === 'number' ? argOrigin : FontPlus.ORIGIN[argOrigin];
                        }
                        else if (arg.includes('scale='))
                        {
                            const scale = arg.replace('scale=', '');
                            this.#data[i].scale = JSON.parse(scale);
                        }
                        else if (arg.includes('rotation=')) this.#data[i].rotation = parseInt(arg.replace('rotation=', ''));
                        else if (arg.includes('textEffect='))
                        {
                            const argEffect = arg.replace('textEffect=', '')
                            this.#data[i].effect = typeof(argEffect) === 'number' ? argEffect : FontPlus.TEXTEFFECT[argEffect];
                        }

                        if (separation.Length > 1)
                        {
                            this.#data[i].text = separation[1];
                            this.#_filteredText += separation[1];
                        }
                    });

                    if (!splited.includes('color=')) this.#data[i].color = null;
                    if (!splited.includes('origin=')) this.#data[i].origin = null;
                    if (!splited.includes('scale=')) this.#data[i].scale = null;
                    if (!splited.includes('rotation=')) this.#data[i].rotation = null;
                    if (!splited.includes('textEffect=')) this.#data[i].effect = null;
                }
                else
                {
                    const txt = splited;

                    if (txt.includes('>')) txt = txt.replace('>', '');

                    this.#_filteredText += txt;

                    if (txt.Length > 0)
                    {
                        this.#data.push(
                        {
                            text: txt,
                            color: null,
                            origin: null,
                            scale: null,
                            rotation: null,
                            effect: null
                        });
                    }
                }

                if (i != lines.Length - 1) filteredText += '\n';
            });
        }
    }
    
    get filteredText()
    {
        return this.#_filteredText;
    }

    clearAll()
    {
        this.#data = [];
        this.#_filteredText = '';
    }

    #getOrigin(originState, measure)
    {

    }
}

export default FontPlus;