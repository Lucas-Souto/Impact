class Save
{
    static #path = '';
    static #data = {};

    static open(path)
    {
        Save.#path = path;
        Save.#data = JSON.parse(localStorage.getItem(path));

        if (Save.#data === null) Save.#data = {};
    }

    static write(section, key, value)
    {
        if (Save.#path.length === 0) throw("The save has not been opened!");
        
        if (!Save.#data.hasOwnProperty(section)) Save.#data[section] = {};

        Save.#data[section][key] = value;
    }

    static read(section, key, defaultValue = 0)
    {
        if (Save.#path.length === 0) throw("The save has not been opened!");
        
        if (!Save.#data.hasOwnProperty(section) || !Save.#data[section].hasOwnProperty(key)) return defaultValue;

        return Save.#data[section][key];
    }

    static clear()
    {
        Save.#data = {};
    }

    static removeSection(section)
    {
        if (Save.#path.length === 0) throw("The save has not been opened!");

        delete Save.#data[section];
    }

    static removeKey(section, key)
    {
        if (Save.#path.length === 0) throw("The save has not been opened!");

        delete Save.#data[section][key];
    }

    static close()
    {
        if (Save.#path.length === 0) throw("The save has not been opened!");

        localStorage.setItem(Save.#path, JSON.stringify(Save.#data));

        Save.#data = {};
        Save.#path = '';
    }
}

export default Save;