var express = require('express');
var cheerio = require("cheerio")
var https = require("https")
var request = require("request")
const util = require("./util")
const ligamagic = require("./ligamagic")

var app = express();    

/**
 * Recupera dados da carta usando api do scryfall
 * @param {*} nomeDaCarta 
 */
function recuperaDadosDaCarta(nomeDaCarta)
{
    return new Promise(function(resolve, reject)
    {
        request({
            uri: "https://api.scryfall.com/cards/named?exact=" + nomeDaCarta,
            method: "GET",
            timeout: 10000,
            followRedirect: true,
            maxRedirects: 10
        }, 
        function(error, response, body) 
        {
            //Check for error
            if(error)
            {
                reject(error)
            }
            else if (response.statusCode !== 200)
            {
                reject(response.statusCode)
            }
            else
            {
                resolve(body)
            }
        });
    })
}

/**
 * Extrai os dados da carta do html e faz a consulta na base do scryfall
 * @param {} doHtml 
 */
function extrairCartaFull(doHtml)
{
    //var retorno = ligamagic.extrairDadosPreco(doHtml)

    //return recuperaDadosDaCarta(retorno.nomeCartaIngles).then(dadosCarta => 
    //{
     //   retorno.dadosCarta = JSON.parse(dadosCarta)
      //  return retorno
    //})
}

app.listen(3001, function () 
{
    console.log('Listening on port 3001!');
}).on('error', function(error)
{
    console.log("Erro: " + error)
});

app.get("/frete", function(req, res)
{
    ligamagic.listarOpcoesFrete(req.query.idloja, req.query.cep, req.query.valor)
                .then(resultado => res.send(resultado))
                .catch(erro => res.status(500).send(erro.message))
})

app.get("/calcula", function(req, res){
    request({
        uri: "https://api-chico.labbs.com.br/chicou/list",
        method: "POST",
        timeout: 10000,
        followRedirect: true,
        maxRedirects: 10
    }, function(error, response, body) {
        //Check for error
        if(error){
            res.send('Error:', error);
        }

        //Check for right status code
        if(response.statusCode !== 200){
            res.send('Invalid Status Code Returned:', response.statusCode);
        }

        //All is good. Print the body
        var dados = response.body.replace(/<pre>/g, "").replace(/<\/pre>/g, "").trim().replace(/\n/g, ",")

        // console.log(dados)

        var dadosObj = JSON.parse("["+dados+"]")
        var somaMilho = 0
        var somaSoja = 0

        for(var x =0; x< dadosObj.length; x++){
            if(dadosObj[x].empreendimentos){
                for(var y =0; y< dadosObj[x].empreendimentos.length; y++){
                    if(dadosObj[x].empreendimentos[y].lavoura == "59"){
                        somaSoja += parseInt(dadosObj[x].empreendimentos[y].area)
                    } else {
                        somaMilho += parseInt(dadosObj[x].empreendimentos[y].area)
                    }
                }
            } else {
                if(dadosObj[x].lavoura == "59"){
                    somaSoja += parseInt(dadosObj[x].area)
                } else {
                    somaMilho += parseInt(dadosObj[x].area)
                }
            }
        }

        var resposta = {}
        resposta.areaMilho = somaMilho
        resposta.areaSoja = somaSoja

        res.send(resposta); // Show the HTML for the Modulus homepage.
    });
})

app.get("/deck_value/:idDeckLigaMagic", function(req, res)
{
    var idDeck = req.params.idDeckLigaMagic

    const async = require("async")

    ligamagic.consultarDeck(idDeck)
             .then(deck =>
             {
                var mCallback = (erro =>
                {
                    if (erro)
                    {
                        res.status(500).send(erro.message)
                        return 
                    }

                    var reduceF = (acc, curVal) => acc + (parseFloat(curVal.preco_minimo.replace(",", ".")) * curVal.quantidade)

                    deck.precoMainboard = deck.mainboard.reduce(reduceF, 0)
                    deck.precoSideboard = deck.sideboard.reduce(reduceF, 0)
                    deck.precoTotal = (deck.precoMainboard + deck.precoSideboard).toFixed(2).toString().replace(".", ",")

                    deck.precoMainboard = deck.precoMainboard.toFixed(2).toString().replace(".", ",")
                    deck.precoSideboard = deck.precoSideboard.toFixed(2).toString().replace(".", ",")

                    res.send(deck)
                })

                async.each(deck.mainboard.concat(deck.sideboard), function(carta, callback)
                {
                    ligamagic.consultarCarta(carta.nomeIngles).then(precos => 
                    {
                        //carta.precos = precos -- removido por adicionar muita informacao
                        carta.precos = []
                        carta.precos.push(precos.lojas[0])
                        carta.precos.push(precos.lojas[1])
                        carta.precos.push(precos.lojas[2])
                        carta.precos.push(precos.lojas[3])
                        carta.preco_minimo = (precos.lojas.length > 0) ? precos.lojas[0].preco : "0"
                        console.log("carta: " + carta.nomeIngles + "/" + carta.preco_minimo)
                        callback()
                    })
                    .catch(err => callback(err))
                }, mCallback)
             })
            .catch(erro => res.status(500).send(erro.message))
})

app.get("/deck/:idDeckLigaMagic", function(req, res)
{
    var idDeck = req.params.idDeckLigaMagic

    ligamagic.consultarDeck(idDeck)
                .then(retorno => res.send(retorno))
                .catch(erro => res.status(500).send(erro.message))
})

app.get("/test/:cardName", function(req, res)
{
    var nomeCarta = req.params.cardName

    ligamagic.consultarCarta(nomeCarta)
                .then(dados => res.send(dados))
                .catch(erro => res.status(500).send(erro.message))
})

process.on('uncaughtException', function(err) 
{
    console.log("*****************")
    console.log("APLICACAO PAROU ")
    console.log(err.message)
    console.log(JSON.stringify(err.stack))
    console.log("*****************")
});