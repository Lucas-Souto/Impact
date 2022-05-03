class Crypt
{
    static caesar(text, encrypt, amount)
    {
        if (amount === 0) return text;

        let txtf = '';
        amount *= encrypt ? 1 : -1;
        
        for (let i = 0; i < text.length - 1; i++)
        {
            const txtb = text.charCodeAt(i);
            const txtc = txtb + amount;
            
            txtf += String.fromCharCode(txtc);
        }

        return txtf;
    }

    static caesarPlus(text, encrypt, amounts)
    {
        if (amounts.length === 0) return text;

        let txtf = '';
        const mult = encrypt ? 1 : -1;
        let amountIndex = 0;
        
        for (let i = 0; i < text.length - 1; i++)
        {
            const txtb = text.charCodeAt(i);
            const txtc = txtb + amounts[amountIndex] * mult;
            
            txtf += String.fromCharCode(txtc);
            amountIndex = amountIndex === amounts.length - 1 ? 0 : amountIndex + 1;
        }

        return txtf;
    }

    static caesarChar(text, encrypt, password)
    {
        if (password.length === 0) return text;

        let txtf = '';
        const mult = encrypt ? 1 : -1;
        let amountIndex = 0;
        
        for (let i = 0; i < text.length - 1; i++)
        {
            const txtb = text.charCodeAt(i);
            const txtc = txtb + password.charCodeAt(amountIndex) * mult;
            
            txtf += String.fromCharCode(txtc);
            amountIndex = amountIndex === password.length - 1 ? 0 : amountIndex + 1;
        }

        return txtf;
    }

    static stringToBinary(text)
    {
        let output = "";

        for (let i = 0; i < text.length; i++) output += text[i].charCodeAt(0).toString(2) + (i < text.length - 1 ? ' ' : '');

        return output;
    }

    static binaryToString(binary)
    {
        const splitted = binary.split(" ");
        let output = [];

        for (i = 0; i < splitted.length; i++) output.push(String.fromCharCode(parseInt(splitted[i], 2)));

        return output.join("");
    }

    static stringToHex(text)
    {
        let output = [];

        for (let i = 0; i < text.length; i++) output.push(Number(text.charCodeAt(i)).toString(16));

        return output.join('');
    }

    static hexToString(hex)
    {
        let output = '';

        for (let i = 0; i < hex.length; i += 2) output += String.fromCharCode(parseInt(hex.substr(i, 2), 16));

        return output;
    }

    static allCrypt(text, encrypt, amount)
    {
        if (encrypt) return Crypt.stringToBinary(Crypt.stringToHex(Crypt.caesar(text, encrypt, amount)));

        return Crypt.caesar(Crypt.hexToString(Crypt.binaryToString(text)), encrypt, amount);
    }

    static allCryptPlus(text, encrypt, amounts)
    {
        if (encrypt) return Crypt.stringToBinary(Crypt.stringToHex(Crypt.caesarPlus(text, encrypt, amounts)));

        return Crypt.caesarPlus(Crypt.hexToString(Crypt.binaryToString(text)), encrypt, amounts);
    }

    static allCryptChar(text, encrypt, password)
    {
        if (encrypt) return Crypt.stringToBinary(Crypt.stringToHex(Crypt.caesarChar(text, encrypt, password)));

        return Crypt.caesarChar(Crypt.hexToString(Crypt.binaryToString(text)), encrypt, password);
    }
}

export default Crypt;