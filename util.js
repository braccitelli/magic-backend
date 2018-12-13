"use strict"

const https = require("https")


/**
 * Faz o download do html do endereço passado como parâmetro.
 * OBS: O código assume que o endereço é HTTPS
 * @param {*} endereco 
 */
function downloadHTML(endereco)
{
    var allData = ""

    return new Promise(function(resolve, reject)
    {
        https.get(endereco, res => 
        {
            res.on("data", d => 
            {
                allData += d
            })
    
            res.on("end", () => 
            {
                resolve(allData)
            })

            res.on("error", err => reject(err))
        })
    })
}

module.exports = 
{
    downloadHTML : function(endereco)
    {
        return downloadHTML(endereco)
    }
}