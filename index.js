const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const client = new Discord.Client({ partials: ['MESSAGE', 'CHANNEL', 'REACTION']});
const configs = require('./config.json');
const google = require('googleapis');
const fs = require('fs');

const prefixo = configs.PREFIX;

const youtube = new google.youtube_v3.Youtube({
    verson: 'v3',
    auth: configs.GOOGLE_KEY
});

/*
        connection: null,
        dispatcher: null,
        fila: [],
        playing: false
*/

const servidores = [];

client.on("guildCreate", (guild) => {
    console.log("GuildID: " + guild.id);
    console.log("GuildNAME: " + guild.name);

    servidores[guild.id] = {
        connection: null,
        dispatcher: null,
        fila: [],
        playing: false,
        loop: false
    }

    saveServer(guild.id);
});

client.on("messageReactionAdd", async (reaction, user) => {
    if (reaction.partial){
        try{
            await reaction.fetch();
        }catch (err){
            console.log(err);
        }
    }

    //const guild = client.guilds.cache.get("374013928872607756")
    const guild = reaction.message.guild.id;
    //const role = guild.roles.cache.get("818989388654575647")
    const role = reaction.message.guild.roles.cache.find(r => r.name === "Ferro")
    const role2 = reaction.message.guild.roles.cache.find(r => r.name === "Bronze")
    const role3 = reaction.message.guild.roles.cache.find(r => r.name === "Prata")
    const role4 = reaction.message.guild.roles.cache.find(r => r.name === "Ouro")
    const role5 = reaction.message.guild.roles.cache.find(r => r.name === "Platina")
    const member = reaction.message.guild.member(user)

    if(reaction.message.channel === reaction.message.guild.channels.cache.find(channel => channel.name ==="ranking")){
        if (reaction.message.id !== reaction.message.channel.lastMessageID) return
        else{
            if (reaction.emoji.name === "♟"){
                member.roles.add(role);
            }
            if (reaction.emoji.name === "🥉"){
                member.roles.add(role2);
            }
            if (reaction.emoji.name === "🥈"){
                member.roles.add(role3);
            }
            if (reaction.emoji.name === "🥇"){
                member.roles.add(role4);
            }
            if (reaction.emoji.name === "🎖"){
                member.roles.add(role5);
            }
        }
    }
}) 


// ---> O que aparece quando o bot fica online. (Status, avisa que está online, PLAYING - JOGANDO / LISTERNING - ESCUTANDO ...) <---
client.on("ready", () => {
    loadServers();
    console.log('Estou online!');
    console.log(`Servers:${client.guilds.cache.size}`);
    console.log(`members: ${client.users.cache.size}`);
    let activities = [
        `${client.guilds.cache.size} servidores`,
        `${client.users.cache.size} usuários`,
        `use ${prefixo}help or ${prefixo}commands`,
    ],
    i = 0;
    setInterval(() => client.user.setActivity(`${activities[i++ % activities.length]}`,{
        type: "PLAYING"
    }), 10000);
    
});


// ---> comando que captura se o usuário mencionar o bot com o @ <---
client.on("message", msg => {
    if (msg.content == `<@${client.user.id}>` || msg.content == `<@!${client.user.id}>`){
        //return msg.channel.send(` 👉 | Olá ${msg.author}, use ${prefixo}help para acessar a lista de comandos.`);
        const embed = new Discord.MessageEmbed()
        .addField(`Olá, usuário.`, "`Você pode usar o comando help ou commands para ter acesso a lista de comandos do bot.`")
        msg.channel.send(embed);
    }

})

// ---> Comando para mandar mensagens para pessoas que acabaram de entrar no servidor <---
client.on("guildMemberAdd", (member) => {
    const channel = member.guild.channels.cache.find(channel => channel.name === 'portarias-bp_texto');
    if (!channel) return;

    const joinembed = new Discord.MessageEmbed()
    .setTitle('A new member just arrived!')
    .setDescription(`Welcome ${member}. We hope you enjoy your stay here!`)
    .setColor("#FF0000")
    channel.send(joinembed);

    const embed = new Discord.MessageEmbed()
    .setTitle('Welcome to our server!')
    .setDescription("Hey There! I'm doorman, and I'm happy for see you here.\n If you have doubts, use `-help or -commands` for answer youself.")

    member.send(embed);
})

// ---> comando para mandar mensagem quando o membro sai do servidor <---
client.on("guildMemberRemove", (member) => {
    const channel = member.guild.channels.cache.find(channel => channel.name === 'portarias-bp_texto');
    if(!channel) return;

    const leftembed = new Discord.MessageEmbed()
    .setTitle('A member just left of the server.')
    .setDescription(`It is a pity! The member ${member} just left of the server.`)

    channel.send(leftembed);
})


client.on("message", async (msg) => {

    //filtro

    if (!msg.guild) return;
    if(!msg.content.startsWith(prefixo)) return;
    
    if (msg.channel.type === "dm") return;
    if (msg.author.bot) return;
    
    //Comandos
    if(msg.content === prefixo + 'leave'){
        msg.member.voice.channel.leave();
        servidores[msg.guild.id].connection = null;
        servidores[msg.guild.id].dispatcher = null;
        servidores[msg.guild.id].playing = false;
        servidores[msg.guild.id].fila = [];
        msg.channel.send("❌ | Você retirou o bot do canal de voz.");
    }

    if(msg.content === prefixo + 'titanic'){
        servidores[msg.guild.id].connection = await msg.member.voice.channel.join();
        servidores[msg.guild.id].connection.play('teste.mp3');
    }

    //Comando de Play

    if(msg.content.startsWith(prefixo + 'play')){
        //Exclui o prefixo + 'play' e o espaço para fazer a pesquisa no youtube.
        let link = msg.content.slice(6);

        //Verifica se existe o link
        if(link.length === 0){
            msg.channel.send("Preciso de um link para reproduzir a música.");
            return
        }

        if (servidores[msg.guild.id].connection === null) {
            try{
                servidores[msg.guild.id].connection = await msg.member.voice.channel.join();
            }catch (err) {
                console.log("ERRO AO ENTRAR EM UM CANAL DE VOZ.");
                console.log(err);
            }
        }

        //Verifica se o link é do youtube
        if(ytdl.validateURL(link)){
            servidores[msg.guild.id].fila.push(link);
            msg.channel.send("▶️ | Tocando a música: " + link);
            tocaMusicas(msg);
            console.log("Adicionado na lista: " + link);
        }
        else{
            //ele pesquisa no google se não for um link
            youtube.search.list({
                q: link,
                part: 'snippet',
                fields: 'items(id(videoId), snippet(title, channelTitle))',
                type: 'video'
            }, function(err, resultado){
                if(err){
                    console.log(err);
                }
                if(resultado){
                    const listaResultados = [];
                    for (let i in resultado.data.items){
                        const montaItem = {
                            'tituloVideo': resultado.data.items[i].snippet.title,
                            'nomeCanal': resultado.data.items[i].snippet.channelTitle,
                            'id': "https://www.youtube.com/watch?v=" + resultado.data.items[i].id.videoId
                        }
                        listaResultados.push(montaItem);
                    }
                    const embed = new Discord.MessageEmbed()
                    .setColor([112, 20, 113])
                    .setAuthor('Escolha uma opção de 1-5')
                    .setDescription('\u200b');
                    for (let i in listaResultados){
                        embed.addField(`${parseInt(i) + 1}: ${listaResultados[i].tituloVideo}`,
                        listaResultados[i].nomeCanal);
                    }
                    msg.channel.send(embed)
                    .then((embedMessage) => {
                        const reacts = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
                        for (let i = 0; i < reacts.length; i++){
                            embedMessage.react(reacts[i]);
                        }
                        
                        const filter = (reaction, user) => {
                            return reacts.includes(reaction.emoji.name) 
                                && user.id === msg.author.id;
                        }

                        embedMessage.awaitReactions(filter, {max: 1, time: 20000, errors: ['time']})
                            .then((collected) => {
                                const reaction = collected.first();
                                const idOptionChosen = reacts.indexOf(reaction.emoji.name);

                                msg.channel.send(`▶️ | *Você escolheu a música* **${listaResultados[idOptionChosen].tituloVideo}**
                                *de* **${listaResultados[idOptionChosen].nomeCanal}**`);
                                console.log("Adicionado na lista: " + link);

                                servidores[msg.guild.id].fila.push(listaResultados[idOptionChosen].id);
                                tocaMusicas(msg);
                            }).catch((err) => {
                                msg.reply("Você não escolheu uma opção válida.");
                                console.log(err);
                            });

                    });
                }
            });
        }
    }

    if(msg.content === prefixo + 'stop'){
        msg.channel.send("⏹ | Você parou de tocar a música e limpou sua playlist.");
        servidores[msg.guild.id].dispatcher.pause();
        servidores[msg.guild.id].dispatcher = null;
        servidores[msg.guild.id].playing = false;
        servidores[msg.guild.id].fila = [];
    }

    //Comandos de Informações

    if(msg.content === prefixo + 'help' || msg.content === prefixo + 'commands'){
        const embed = new Discord.MessageEmbed()
        .setTitle("Guia de Ajuda")
        .setDescription("_Aqui está listado todos os comandos que você precisa usar e suas funções!_")
        .setColor("RANDOM")
        .addField("Comandos do Bot", "\u200b")
        .addField(`▶️ | ${prefixo}play`, "`Toca as músicas diretamente do Youtube. Você pode colocar o link ou digitar o nome da música!`")
        .addField(`⏭ | ${prefixo}skip`, "`Com este comando, você pula a música que está em execução para a próxima da fila.`")
        .addField(`🔁 | ${prefixo}loop`, "`Esse comando toca uma música ou uma playlist a cada vez que ela termina.`")
        .addField(`⏹ | ${prefixo}stop`, "`Com este comando você pausa a música que está tocando no momento e limpa a sua playlist.`")
        .addField(`❌ | ${prefixo}leave`, "`Você retira o bot do canal de voz e o reseta completamente. Qualquer problema de funcionamento do bot você pode usar esse comando.`")
        .addField(`📣 | ${prefixo}info`, "`Obtém mais informações do bot, sobre o que ele faz e o que está prestes a aprender.`")
        .addField(`🏆 | ${prefixo}elo`, "`Esse comando faz com que você personalize todo o seu servidor. Ele irá fornecer o cargo conforme o usuário informe em qual ELO ele está no valorant. \n Para informações mais detalhadas sobre esse comando, use -ranking`")
        .setImage(msg.guild.iconURL({dynamic: true, format: "png", size: 1024}))
        //.setThumbnail(client.user.displayAvatarURL({dynamic: true, format: "png", size: 1024}))
        .setFooter(`Server: ${msg.guild.name}\nAutomatic Message`)
        .setTimestamp()

        msg.author.send(embed);
        msg.channel.send("Guia de ajuda enviado para a sua DM.");
    }

    
    //Definindo o status do bot

    if (msg.content === prefixo + 'skip'){
        //Comando de pular a música para a próxima da fila
        const pular = servidores[msg.guild.id].fila[1];
        servidores[msg.guild.id].dispatcher = servidores[msg.guild.id].connection.play(ytdl(pular, configs.YTDL));
        servidores[msg.guild.id].fila.shift();
        msg.channel.send("⏭ | Você pulou para a próxima música da fila!");
    }

    if (msg.content === prefixo + 'info') {
        const embed = new Discord.MessageEmbed().
        setTitle("📣 | Olá 👋, prazer em te conhecer! Aqui vai algumas informações sobre mim...")
        .setDescription(`➛ Olá, ${msg.author}, eu sou o Porteiro e fui criado não para ser um bot com tantas informações, somente com coisas básicas!`)
        .addFields(
            {
                name: "🎼 | Músicas",
                value: "Sei tocar músicas diretamente do YouTube, você pode falar o nome do vídeo ou copiar a URL."
            },

            {
                name: "👨🏻‍✈️ | Administração",
                value: "Ainda estou em testes com essa função, mas pretendo saber administrar bem o seu servidor."
            },

            {
                name: "💬 | Sociável",
                value: "Tenho um comando de boas vindas, para você implementar isso ao seu servidor,\n basta ter um canal de voz com o nome de `portarias-bp_texto`."
            }
        )

        msg.channel.send(embed);
    }

    if(msg.content === prefixo + 'loop'){
        msg.channel.send("🔁 | Você ativou o loop!");
        servidores[msg.guild.id].loop = true;
        repeat(msg);
    }

    if (msg.content === prefixo + 'elo'){
        const embed = new Discord.MessageEmbed()
        .setTitle("Which ranking are you currently in valorant?")
        .setDescription(`*Use this message for tell us what rank you are.*`)
        .addField("`♟ - Ferro`", "\u200b")
        .addField("`🥉 - Bronze`", "\u200b")
        .addField("`🥈 - Prata`", "\u200b")
        .addField("`🥇 - Ouro`", "\u200b")
        .addField("`🎖- Platina`", "\u200b")
        .addField("`💎 - Diamante (Ainda será implementado)`", "\u200b")
        .addField("`☠️ - Imortal (Ainda será implementado)`", "\u200b")
        .addField("`🌟 - Radiante (Ainda será implementado)`", "\u200b")
        .addField("__Vote in your ELO!__", "\u200b")
        msg.channel.send(embed)
         .then((embedMessage) => {
             const reacts = ['♟' , '🥉', '🥈', '🥇', '🎖'];
             for (let i = 0; i < reacts.length; i++){
                 embedMessage.react(reacts[i]);
             }
         })
    }

    if (msg.content === prefixo + 'ranking') {
        const embed = new Discord.MessageEmbed()
        .setTitle("Guia de instrução do comando -elo")
        .setDescription("Você precisará criar um canal de texto em seu servidor com o nome _ranking_ (deve ser tudo em minúsculo para que funcione corretamente)")
        .addField("1 - Crie no seu servidor, cargos com os nomes dos elos do valorant", "`O cargo deve ter a primeira letra maiúscula. Ex.: Ferro / Platina`")
        .addField("2 - Permissões do canal de texto", "`O canal de texto (ranking) que você criou, o cargo` **everyone** `deve esta apenas com as permissões (Ver canal), (Adicionar reações) e (Ver histórico de mensagens) ativadas.` ")
        .addField("3 - Enviando mensagem do bot", "`Agora você pode digitar no canal de texto (ranking) o comando -elo para que ele possa enviar a mensagem de votação do ELO`")
        .addField("Observações Adicionais", "`A mensagem do BOT deve ser a ÚLTIMA do canal de texto ranking para que funcione perfeitamente.`")
        msg.channel.send(embed)
    }

    /*if(msg.content === prefixo + 'lista'){
        const embed = new Discord.MessageEmbed()
        .setAuthor("Teste")
        .setDescription("Teste")
        servidores[msg.guild.id].fila.length
        console.log(servidores[msg.guild.id].fila);
    }*/

    /*if(msg.content === prefixo + 'server'){
        console.log(msg.guild.name);
    }*/

});

// ---> Comando para funcionar o looping de músicas <---
const repeat = (msg) => {
    if(servidores[msg.guild.id].loop === true){
        const tocando = servidores[msg.guild.id].fila[0];

        servidores[msg.guild.id].dispatcher.on('finish', () => {
            servidores[msg.guild.id].dispatcher = servidores[msg.guild.id].connection.play(ytdl(tocando, configs.YTDL));
            servidores[msg.guild.id].fila.push(tocando);
            servidores[msg.guild.id].fila.shift();
            repeat(msg);
        });
    }
}

// ---> Comando para tocar músicas <---
const tocaMusicas = (msg) => {

    if (servidores[msg.guild.id].playing === false) {

        const tocando = servidores[msg.guild.id].fila[0];
        servidores[msg.guild.id].playing = true;
        servidores[msg.guild.id].dispatcher = servidores[msg.guild.id].connection.play(ytdl(tocando, configs.YTDL));

        //Se a música terminar, vai receber um 'finish'
        servidores[msg.guild.id].dispatcher.on('finish', () => {
            //exclui a música da fila quando recebe um 'finish'.
            servidores[msg.guild.id].fila.shift();
            servidores[msg.guild.id].playing = false;
            //verifica se na fila tem mais músicas ou não.
            if (servidores[msg.guild.id].fila.length > 0){
                tocaMusicas(msg);
            }
            else{
                msg.member.voice.channel.leave();
                servidores[msg.guild.id].connection = null;
                servidores[msg.guild.id].dispatcher = null;
                servidores[msg.guild.id].playing = false;
                servidores[msg.guild.id].fila = [];
            }
        });
    }
}

const loadServers = () => {
    fs.readFile('serverList.json', 'utf8', (err, data) => {
        if (err) {
            console.log('Ocorreu um erro em ler o registro de servidores.');
            console.log(err);
        }
        else{
            const readObj = JSON.parse(data);
            for (let i in readObj.servers){
                servidores[readObj.servers[i]] = {
                    connection: null,
                    dispatcher: null,
                    fila: [],
                    playing: false,
                    loop: false
                }
            }
        }
    });
}

//salvando os servers no serverList.json
const saveServer = (newIdServer) => {
    fs.readFile('serverList.json', 'utf8', (err, data) => {
        if (err){
            console.log('Ocorreu um erro ao ler o arquivo para salvar um novo IdServer.');
            console.log(err);
        }
        else{
            const readObj = JSON.parse(data);
            readObj.servers.push(newIdServer);
            const writeObj = JSON.stringify(readObj);
            fs.writeFile('serverList.json', writeObj, 'utf8', () => {});
        }
    });
}


client.login(configs.TOKEN_DISCORD);