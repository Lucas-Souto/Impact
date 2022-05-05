import KG from "../krater/krater.js";
import Input from "../krater/input.js";

KG.normalizeVendorAttribute(navigator, 'getGamepads');

class InputPlus extends Input
{
    static GAMEPAD_BUTTON_OFFSET = 256;
    static GAMEPAD =
    {
        FACE_1: InputPlus.GAMEPAD_BUTTON_OFFSET + 0, // A
        FACE_2: InputPlus.GAMEPAD_BUTTON_OFFSET + 1, // Y
        FACE_3: InputPlus.GAMEPAD_BUTTON_OFFSET + 2, // B
        FACE_4: InputPlus.GAMEPAD_BUTTON_OFFSET + 3, // X
        LEFT_SHOULDER: InputPlus.GAMEPAD_BUTTON_OFFSET + 4,
        RIGHT_SHOULDER: InputPlus.GAMEPAD_BUTTON_OFFSET + 5,
        LEFT_SHOULDER_BOTTOM: InputPlus.GAMEPAD_BUTTON_OFFSET + 6,
        RIGHT_SHOULDER_BOTTOM: InputPlus.GAMEPAD_BUTTON_OFFSET + 7,
        SELECT: InputPlus.GAMEPAD_BUTTON_OFFSET + 8,
        START: InputPlus.GAMEPAD_BUTTON_OFFSET + 9,
        LEFT_ANALOGUE_STICK: InputPlus.GAMEPAD_BUTTON_OFFSET + 10,
        RIGHT_ANALOGUE_STICK: InputPlus.GAMEPAD_BUTTON_OFFSET + 11,
        PAD_TOP: InputPlus.GAMEPAD_BUTTON_OFFSET + 12,
        PAD_BOTTOM: InputPlus.GAMEPAD_BUTTON_OFFSET + 13,
        PAD_LEFT: InputPlus.GAMEPAD_BUTTON_OFFSET + 14,
        PAD_RIGHT: InputPlus.GAMEPAD_BUTTON_OFFSET + 15
    };

    gamepad = null;
    lastButtons = {};
	hasButtonObject = !!window.GamepadButton;

    getFirstGamepadSnapshot()
    {
        if(!navigator.getGamepads) return null;// No Gamepad support; nothing to do here

		const gamepads = navigator.getGamepads();

		for(let i = 0; i < gamepads.length; i++)
        {
			if(gamepads[i]) return gamepads[i];
		}

		return null;
	}

	pollGamepad()
    {
        if(!navigator.getGamepads) return;// No Gamepad support; nothing to do here

		this.gamepad = this.getFirstGamepadSnapshot();

		if(!this.gamepad) return;// No gamepad snapshot?

		// Iterate over all buttons, see if they're bound and check
		// for their state
		for(let b = 0; b < this.gamepad.buttons.length; b++)
		{
			const action = this.bindings[b + InputPlus.GAMEPAD_BUTTON_OFFSET];
			let currentState = false;

			// Is the button bound to an action?
			if(action)
			{
				const button = this.gamepad.buttons[b];
				currentState = (typeof button.pressed !== 'undefined')
					? button.pressed // W3C Standard 
					: button; // Current Chrome version
				
				const prevState = this.lastButtons[b];
				
				if(!prevState && currentState)// Was not pressed, but is now?
				{					
					this.actions[action] = true;
					this.presses[action] = true;
				}
				else if( prevState && !currentState ) this.delayedKeyup[action] = true;// Was pressed, but is no more?
			}

			this.lastButtons[b] = currentState;
		}
	}
}

export default InputPlus;