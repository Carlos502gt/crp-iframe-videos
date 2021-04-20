window.addEventListener("message", function (e) {
	//console.log(e.currentTarget.document.referrer);
	console.log('[CR Premium] Player encontrado!')

	var video_config_media = JSON.parse(e.data.video_config_media);
	var user_lang = e.data.lang;
	var video_stream_url = "";
	var video_id = video_config_media['metadata']['id'];
	var rows_number = 0;
	var video_m3u8_array = [];
	var video_m3u8 = "";
	var episode_title = "";
	var episode_translate = "";
	var series_title = "";
	var series_url = e.currentTarget.document.referrer;
	var is_ep_premium_only = null;
	var video_dash_playlist_url_old = "";
	var video_dash_playlist_url = "";

	if (user_lang == "enUS")
		var series_rss = "https://www.crunchyroll.com/" + series_url.split("/")[3] + ".rss";
	else
		var series_rss = "https://www.crunchyroll.com/" + series_url.split("/")[4] + ".rss";

	// Obter streams
	const streamlist = video_config_media['streams'];
	for (let stream of streamlist) {
		// Premium                                                             vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv - versões "International Dub"
		if (stream.format == 'trailer_hls' && stream.hardsub_lang == user_lang || (streamlist.length < 15 && stream.hardsub_lang === null))
			if (rows_number <= 4) {
				// video_m3u8_array.push(await getDirectStream(stream.url, rows_number));
				video_mp4_array.push(getDirectFile(stream.url));
				rows_number++;
				// mp4 + resolve temporario até pegar link direto da m3u8
				if (rows_number > 4) {
					video_m3u8_array = video_mp4_array;
					for (let i in r) {
						const idx = i;
						setTimeout(() => request[idx].resolve(), 400);
					}
					break;
				}
			}
		// Padrão
		if (stream.format == 'adaptive_hls' && stream.hardsub_lang == user_lang) {
			video_stream_url = stream.url;
			video_m3u8_array = await m3u8ListFromStream(video_stream_url);
			video_mp4_array = mp4ListFromStream(video_stream_url);
			break;
		}
	}

	// Pega varias informações pela pagina rss.
	let crproxy = 'https://cors-anywhere.herokuapp.com/';
	let allorigins = 'https://api.allorigins.win/raw?url=';

	console.log('[CR Premium] Linkando stream...')
	console.log(allorigins + series_rss);
	$.ajax({
		async: true,
		type: "GET",
		url: allorigins + series_rss,
		contentType: "text/xml; charset=utf-8",
		complete: response => {
			//Pega o titulo da serie
			series_title = $(response.responseXML).find("image").find("title").text();

			//Pega o numero e titulo do episodio
			langs = { "ptBR": "Episódio ", "enUS": "Episode ", "enGB": "Episode ", "esLA": "Episodio ", "esES": "Episodio ", "ptPT": "Episódio ", "frFR": "Épisode ", "deDE": "Folge ", "arME": "الحلقة ", "itIT": "Episodio ", "ruRU": "Серия " };
			episode_translate = langs[user_lang[0]] ? langs[user_lang[0]] : "Episode ";

			if (video_config_media['metadata']['up_next'] == undefined)
				episode_title = series_title + ' - ' + episode_translate + video_config_media['metadata']['display_episode_number'];
			else {
				var prox_ep_number = video_config_media['metadata']['up_next']['display_episode_number'];
				episode_title = video_config_media['metadata']['up_next']['series_title'] + ' - ' + prox_ep_number.replace(/\d+/g, '') + video_config_media['metadata']['display_episode_number'];
			}

			// Checa se o URL do video_mp4_array[id] existe e calcula o tamanho p/ download
	function linkDownload(id) {
		console.log('  - Baixando: ', r[id])
		let video_mp4_url = video_mp4_array[id];

		let fileSize = "";
		let http = (window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP"));
		http.onreadystatechange = () => {
			if (http.readyState == 4 && http.status == 200) {
				fileSize = http.getResponseHeader('content-length');
				if (!fileSize)
					return setTimeout(() => linkDownload(id), 5000);
				else {
					let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
					if (fileSize == 0) return console.log('addSource#fileSize == 0');
					let i = parseInt(Math.floor(Math.log(fileSize) / Math.log(1024)));
					if (i == 0) return console.log('addSource#i == 0');
					let return_fileSize = (fileSize / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
					dlSize[id].innerText = return_fileSize;
					return console.log(`[CR Premium] Source adicionado: ${r[id]} (${return_fileSize})`);
				}
			} else if (http.readyState == 4)
				return setTimeout(() => linkDownload(id), 5000);
		}
		http.open("HEAD", video_mp4_url, true);
		http.send(null);
	}

			//Se o episodio não for apenas para premium pega as urls de um jeito mais facil
			if (is_ep_premium_only == false) {
				function linkDownload(id) {		
					console.log('- Baixando: ', r[id])
					video_dash_playlist_url_old = player_current_playlist.replace("master.m3u8", "manifest.mpd").replace(player_current_playlist.split("/")[2], "dl.v.vrv.co").replace("evs1", "evs");
					video_dash_playlist_url = player_current_playlist.replace(player_current_playlist.split("/")[2], "v.vrv.co").replace("evs1", "evs");

					$.ajax({
						async: true,
						type: "GET",
						url: video_dash_playlist_url_old,
						success: (result, status, xhr) => {
							var params_download_link = htmlDecode(pegaString(xhr.responseText, '.m4s?', '"'));
							if (!params_download_link)
								return linkDownload(id);
						
							var video_code = video_dash_playlist_url.split(",")[parseInt(id)+1];
							var video_mp4_url = video_dash_playlist_url.split("_,")[0] + "_" + video_code + params_download_link;
							
							u[id] = video_mp4_url;
							pM1[id].resolve();
						}
					});
				}
				for (id in r)
					linkDownload(id);
			}

			//Se o episodio for apenas para usuarios premium
			if (is_ep_premium_only == true) {
				function linkDownload(id) {
					console.log('- Baixando: ', r[id])
					var video_dash_playlist_url_no_clipe = video_m3u8_array[id].replace("/clipFrom/0000/clipTo/" + video_config_media['metadata']['duration'] + "/index.m3u8", ",.urlset/manifest.mpd");
					var video_dash_playlist_url = video_dash_playlist_url_no_clipe.replace(video_dash_playlist_url_no_clipe.split("_")[0] + "_", video_dash_playlist_url_no_clipe.split("_")[0] + "_,");

					function cb(result, status, xhr) {
						var params_download_link = htmlDecode(pegaString(xhr.responseText, '.m4s?', '"'));
						if (!params_download_link)
							return linkDownload(id);
						var video_mp4_url_old = video_dash_playlist_url.split("_,")[0] + "_" + video_dash_playlist_url.split(",")[1] + params_download_link;
						var video_mp4_url = video_mp4_url_old.replace("dl.v.vrv.co", "v.vrv.co");
						u[id] = video_mp4_url;
						pM1[id].resolve();
					};

					$.ajax({
						async: true,
						type: "GET",
						url: video_dash_playlist_url,
						success: cb
					});
				}

				for (id in r)
					linkDownload(id);
			}

			let sources = [];
			Promise.all(p1).then(() => {
				for (id in r)
					addSource(u[id], id, false);
				Promise.all(p2).then(() => {
					for (i of [1, 0, 2, 3, 4]) {
						const idx = i;
						p2[idx].then(msg => {
							if (msg) sources.push({ file: u[idx], label: r[idx] + '<sup><sup>Não encontrado</sup></sup>'})
							else sources.push({ file: u[idx], label: r[idx] + (idx<2 ? '<sup><sup>HD</sup></sup>' : '')})
						});
					}

					Promise.all(p2).then(()=>startPlayer());
				})
			})

			function startPlayer() {
				// Inicia o player
				var playerInstance = jwplayer("player_div")
				playerInstance.setup({
					"title": episode_title,
					"description": video_config_media['metadata']['title'],
					"sources": sources,
					"image": video_config_media['thumbnail']['url'],
					"width": "100%",
					"height": "100%",
					"autostart": false,
					"displayPlaybackLabel": true,
					"primary": "html5"
				});

				//Variaveis para o botao de baixar.
				var button_iconPath = "assets/icon/download_icon.svg";
				var button_tooltipText = "Baixar Vídeo";
				var buttonId = "download-video-button";

				//funcion ao clicar no botao de fechar o menu de download
				document.querySelectorAll("button.close-modal")[0].onclick = () => {
					document.querySelectorAll(".modal")[0].style.visibility = "hidden";
				};

				//function ao clicar no botao de baixar
				function download_ButtonClickAction() {
					//Se estiver no mobile, muda um pouco o design do menu
					if (jwplayer().getEnvironment().OS.mobile == true) {
						document.querySelectorAll(".modal")[0].style.height = "170px";
						document.querySelectorAll(".modal")[0].style.overflow = "auto";
					}

					//Mostra o menu de download
					document.querySelectorAll(".modal")[0].style.visibility = "visible";
					return;
				}

				playerInstance.addButton(button_iconPath, button_tooltipText, () => download_ButtonClickAction(), buttonId);

				// Definir URL e Tamanho na lista de download
				for (let id in r) {
					document.getElementById(r[id] + "_down_url").href = u[id];
					document.getElementById(r[id] + "_down_size").innerText = s[id];
				}

				//Funções para o player
				jwplayer().on('ready', e => {
					//Seta o tempo do video pro salvo no localStorage		
					if (localStorage.getItem(video_id) != null) {
						document.getElementsByTagName("video")[0].currentTime = localStorage.getItem(video_id);
					}
					document.body.querySelector(".loading_container").style.display = "none";
				});
				//Mostra uma tela de erro caso a legenda pedida não exista.
				jwplayer().on('error', e => {
					console.log(e)
					if (e.code == 232011) {
						jwplayer().load({
							file: "https://i.imgur.com/OufoM33.mp4"
						});
						jwplayer().setControls(false);
						jwplayer().setConfig({
							repeat: true
						});
						jwplayer().play();
					}
				});
				
				//Fica salvando o tempo do video a cada 5 segundos.
				setInterval(() => {
					if (jwplayer().getState() == "playing")
						localStorage.setItem(video_id, jwplayer().getPosition());
		}, 7000);
	}

	/* ~~~~~~~~~~ FUNÇÕES ~~~~~~~~~~ */
	function getAllOrigins(url) {
		return new Promise(async (resolve, reject) => {
			await $.ajax({
				async: true,
				type: "GET",
				url: allorigins + encodeURIComponent(url),
				responseType: 'json'
			})
			.then(res=>{
				resolve(res.contents)
			})
			.catch(err=>reject(err));
		})
	}

	// ---- MP4 ---- (baixar)
	// Obtem o link direto pelo trailer (premium)
	function getDirectFile(url) {
		return url.replace(/\/clipFrom.*?index.m3u8/, '').replace('_,', '_').replace(url.split("/")[2], "fy.v.vrv.co");
	}

	// Obtem o link direto pelo padrão (gratis)
	function mp4ListFromStream(url) {
		const cleanUrl = url.replace('evs1', 'evs').replace(url.split("/")[2], "fy.v.vrv.co");
		const res = [];
		for (let i in r)
			res.push(cleanUrl.replace(streamrgx, `_$${(parseInt(i)+1)}`))
		return res;
	}

	// ---- M3U8 ---- (assistir)
	// Obtem o link direto pelo trailer (premium) - to do
	function getDirectStream(url, idx) {
		setTimeout(() => request[idx].resolve(), 400);
	}

	// Obtem o link direto pelo padrão (gratis)
	async function m3u8ListFromStream(url) {
		let m3u8list = []
		const master_m3u8 = await getAllOrigins(url);

		if (master_m3u8) {
			streams = master_m3u8.match(rgx)
			m3u8list = streams.filter((el, idx) => idx%2===0) // %2 === 0 pois há cdns da akamai e da cloudflare
		} else {
			for (let i in r) {
				const idx = i;
				setTimeout(() => request[idx].reject('Manifest m3u8ListFromStream#master_m3u8.length === 0'), 400);
			}
			return [];
		}

		const res = [];
		for (let i in m3u8list) {
			const video_m3u8 = await getAllOrigins(m3u8list[i]);
			m3u8list[i] = blobStream(video_m3u8);
		}
		
		res.push(buildM3u8(m3u8list));
		for (let i in r) {
			const idx = i;
			setTimeout(() => request[idx].resolve(), 400);
		}

		return res;
	}

	function blobStream(stream) {
		const blob = new Blob([stream], {
			type: "text/plain; charset=utf-8"
		});
		return URL.createObjectURL(blob) + "#.m3u8";
	}

	function buildM3u8(m3u8list) {
		const video_m3u8 = '#EXTM3U' +
		'\n#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=4112345,RESOLUTION=1280x720,FRAME-RATE=23.974,CODECS="avc1.640028,mp4a.40.2"' +
		'\n' + m3u8list[0] +
		'\n#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=8098235,RESOLUTION=1920x1080,FRAME-RATE=23.974,CODECS="avc1.640028,mp4a.40.2"' +
		'\n' + m3u8list[1] +
		'\n#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=2087088,RESOLUTION=848x480,FRAME-RATE=23.974,CODECS="avc1.4d401f,mp4a.40.2"' +
		'\n' + m3u8list[2] +
		'\n#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=1090461,RESOLUTION=640x360,FRAME-RATE=23.974,CODECS="avc1.4d401e,mp4a.40.2"' +
		'\n' + m3u8list[3] +
		'\n#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=559942,RESOLUTION=428x240,FRAME-RATE=23.974,CODECS="avc1.42c015,mp4a.40.2"' +
		'\n' + m3u8list[4];
		return blobStream(video_m3u8);
	}
});
