"use strict"

const util = require("./util")
const cheerio = require("cheerio")

/**
 * extrai as informações da carta APENAS a partir do html
 * @param {*} doHtml 
 */
function extrairDadosPreco(doHtml)
{
    var retorno = {}
    retorno.lojas = []

    var $ = cheerio.load(doHtml)

    retorno.nomeCartaIngles = $('#card-info').find('.nome-auxiliar').text()
    retorno.nomeCartaPortugues = $('#card-info').find('.nome-principal').text()

    //extrai as informacoes da carta
    $(".pointer").each(function(i, elem)
    {
        var loja = {}

        loja.nomeLoja = $(this).children(".banner-loja").find('.icon').attr('title')
        loja.iconLoja = 'http:' + $(this).children(".banner-loja").find('.icon').attr('src')
        loja.idLoja = loja.iconLoja.replace(/.*?\/([0-9]*)\.jpg/g,"$1")
        loja.iconEdition = 'http:' + $(this).find('.preto').find('.icon').attr('src')
        loja.nomeEdition = $(this).find('.preto').find('.icon').attr('title')
        loja.abreviaturaEdition = loja.iconEdition.replace(/.*?\/(.{3})_.\.gif/g,"$1")
        loja.isFoil = $(this).find('.col-desktop-hide').children().length > 0
        loja.typeOfFoil = $(this).find('.col-desktop-hide').children().text().replace( /\((.*?)\)/g,"$1")
        
        $(this).find('.lj').children().first().remove()
        loja.preco = $(this).find('.lj').text().replace(/(\r\n|\n|\r)/gm,"").trim().replace(/R\$ (.*)/g,"$1");
        loja.quantidade = $(this).find($('p', 'td').not('.lj')).text().replace(/([0-9]*).*/g, "$1")

        if(loja.nomeLoja != null && loja.nomeLoja.length > 0) 
        {
            retorno.lojas.push(loja)
        }
    })

    return retorno
}


// /**
//  * extrai as informações da carta APENAS a partir do html
//  * @param {*} doHtml 
//  */
// function extrairDadosPreco(doHtml)
// {
//     var retorno = {}
//     retorno.lojas = []

//     var $ = cheerio.load(doHtml)

//     retorno.nomeCartaIngles = $('.card').find('.subtitulo-card').text()
//     retorno.nomeCartaPortugues = $('.card').find('.titulo-card').text()

//     //extrai as informacoes da carta
//     $(".pointer").each(function(i, elem)
//     {
//         var loja = {}

//         loja.nomeLoja = $(this).children(".banner-loja").find('.icon').attr('title')
//         loja.iconLoja = 'http:' + $(this).children(".banner-loja").find('.icon').attr('src')
//         loja.idLoja = loja.iconLoja.replace(/.*?\/([0-9]*)\.jpg/g,"$1")
//         loja.iconEdition = 'http:' + $(this).find('.preto').find('.icon').attr('src')
//         loja.nomeEdition = $(this).find('.preto').find('.icon').attr('title')
//         loja.abreviaturaEdition = loja.iconEdition.replace(/.*?\/(.{3})_.\.gif/g,"$1")
//         loja.isFoil = $(this).find('.col-desktop-hide').children().length > 0
//         loja.typeOfFoil = $(this).find('.col-desktop-hide').children().text().replace( /\((.*?)\)/g,"$1")
        
//         $(this).find('.lj').children().first().remove()
//         loja.preco = $(this).find('.lj').text().replace(/(\r\n|\n|\r)/gm,"").trim().replace(/R\$ (.*)/g,"$1");
//         loja.quantidade = $(this).find($('p', 'td').not('.lj')).text().replace(/([0-9]*).*/g, "$1")

//         if(loja.nomeLoja != null && loja.nomeLoja.length > 0) 
//         {
//             retorno.lojas.push(loja)
//         }
//     })

//     return retorno
// }


/**
 * Faz a consulta de uma carta, retornando a informacao de seu preco em diversas lojas
 * @param {*} nomeCarta 
 */
function consultarCarta(nomeCarta)
{
    //essa funcao e para procurar as cartas - diferente de VER especificamente uma carta
    //const prefixo = "https://www.ligamagic.com.br/?view=cards%2Fsearch&card="
    const prefixo = "https://ligamagic.com.br/?view=cards/card&card="

    return util.downloadHTML(prefixo + nomeCarta).then(allData => 
    {
        var $ = cheerio.load(allData)

        if ($('#cotacao-busca').children().length > 1)
        {
            var nomeParaConsultar = ''
            console.log("Nao achou a carta " + nomeCarta)

            $(".pointer").each(function(i, elem)
            {
                var nomePortugues = $('#card-info').find('.nome-auxiliar').text()
                var nomeIngles = $('#card-info').find('.nome-principal').text()

                if (nomeCarta.trim().toLowerCase() === nomePortugues.trim().toLowerCase() || 
                    nomeCarta.trim().toLowerCase() === nomeIngles.trim().toLowerCase())
                {
                    nomeParaConsultar = nomeIngles
                }
            })

            console.log("tentando o nome " + nomeParaConsultar)

            return util.downloadHTML(prefixo + nomeParaConsultar).then(retorno => extrairDadosPreco(retorno))
        } 
        else 
        {

            return extrairDadosPreco(allData)
            //removido por enquanto - não é necessário consultar as informações da carta neste momento
            //extrairCartaFull(allData).then(cartas => res.send(cartas))
            //                         .catch(erro => res.statusCode(500).message(erro.message).send())
        }
    })
}

/**
 * Lista as opções de frete, a partir do id da loja (ex: 82238), do cep (ex: 70790110) e do valor total (ex: 9.6 para R$9,60)
 * @param {*} idLoja 
 * @param {*} cep 
 * @param {*} valorTotal 
 */
function listarOpcoesFrete(idLoja, cep, valorTotal)
{
    const endereco = `https://www.ligamagic.com.br/ajax/ecom/frete.php?id=${idLoja}&cep=${cep}&vTotal=${valorTotal}`
    const listaOpcoes = []

    return util.downloadHTML(endereco).then(dados => 
    {
        var $ = cheerio.load(dados)

        $("frete").each( (i, elem) => 
        {
            var frete = {}

            frete.nome = elem.attribs['n']
            frete.valor = elem.attribs['v']

            listaOpcoes.push(frete)
        })

        return listaOpcoes
    })
}

function consultarDeck(idDeck)
{
    const prefixo = "https://www.ligamagic.com.br/?view=decks/view&deck="
    
    return util.downloadHTML(prefixo + idDeck).then(allData => 
    {
        var retornoDeck = {}
        retornoDeck.mainboard = []
        retornoDeck.sideboard = []

        var $ = cheerio.load(allData)

        $('#topoDeck_' + idDeck).find("td").each(function(i, elem)
        {
            if ($(this).find(".truncate170").children().length > 0)
            {
                $(this).find(".truncate170").each(function(y, elem)
                {
                    var carta = {}
                    carta.quantidade = $(this).text().replace(/([0-9]*) .*/g, "$1")
                    carta.nomePortugues = $(this).text().replace(/[0-9]* (.*)/g, "$1")
                    carta.nomeIngles = $(this).find("a").attr("href").replace(/.*?card=(.*)/g, "$1")
                    
                    if (i == 0) 
                    {
                        retornoDeck.mainboard.push(carta)
                    } 
                    else if (i==1) 
                    {
                        retornoDeck.sideboard.push(carta)
                    }
                })
            }
        })
        return retornoDeck
    })
}


module.exports = 
{
    consultarDeck : function(idDeck)
    {
        return consultarDeck(idDeck)
    },

    listarOpcoesFrete : function(idLoja, cep, valorTotal)
    {
        return listarOpcoesFrete(idLoja, cep, valorTotal)
    },

    /**
    * Faz a consulta de uma carta, retornando a informacao de seu preco em diversas lojas
    * @param {*} nomeCarta 
    */
    consultarCarta : function(nomeCarta)
    {
        return consultarCarta(nomeCarta)
    }
}