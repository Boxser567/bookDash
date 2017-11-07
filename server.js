var http = require("http")
var fs = require("fs")
var cheerio = require("cheerio")
var iconv = require("iconv-lite")
var request = require('sync-request')
var url = 'http://www.qu.la/book/34575/'

var arrList = [];
var amount = 0;

function start() {
    function onRequest(request, response) {
        http.get(url, function (res) {  //资源请求
            var content = [];
            res.on('data', function (chunk) {
                content.push(chunk);
            })
            res.on('end', function () {
                var html = iconv.decode(Buffer.concat(content), 'utf-8')    //转码操作
                var $ = cheerio.load(html, {
                    decodeEntities: false
                })
                $('#list a').each(function (dom) {
                    arrList.push({ title: $(this).text(), content: null, link: 'http://www.qu.la' + $(this).attr('href') })
                })
                if (arrList && arrList.length) {
                    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
                    response.write("开始执行, 共 " + arrList.length + '章 <br >');
                    getContent(arrList);    //调用获取每一章节的内容
                }


            }).on('error', function () {
                console.log("网页访问出错")
            })
        })


        function getContent(arr) {
            var i = 0;
            do {
                (function (index) {
                    setTimeout(function () {
                        http.get(arr[index].link, function (resContent) {
                            var htmlCon = [];
                            resContent.on('data', function (chunk) {
                                htmlCon.push(chunk);
                            })
                            resContent.on('end', function () {
                                var conText = iconv.decode(Buffer.concat(htmlCon), 'utf-8')    //转码操作
                                var $c = cheerio.load(conText, {
                                    decodeEntities: false
                                })
                                response.write("正在执行第" + index + "章..." + '<br />');
                                arrList[index].content = $c("#content").text().toString() || '';

                                if (index === arrList.length - 1) {
                                    var errArray = [], m = 0;      //统计失败请求数
                                    for (; m < arrList.length; m++) {
                                        if (arrList[m].title && arrList[m].content) {
                                            //if (arr[m].count >= 3) arr[m].content = "当前章节有误。";
                                            var txt = '\n' + arrList[m].title + '\n\n\n' + arrList[m].content;
                                            try {
                                                fs.writeFile('./message.txt', txt, { flag: 'a' }, function (err) {
                                                    if (err)
                                                        console.log('err', err);
                                                });
                                                ++amount;
                                            } catch (e) {
                                                console.log('this never happens: ' + e)
                                            }
                                        } else {
                                            arrList[m].idx = m;
                                            errArray.push(arrList[m]);
                                        }
                                    }

                                    if (errArray.length) {
                                        for (var u = 0; u < errArray.length; u++) {
                                            response.write("出错章节：" + errArray[u].idx + '  ' + errArray[u].title);
                                        }
                                        //getContent(errArray);
                                    }

                                    response.write("<br><br><br><br>共计下载了" + amount + '章节');
                                    response.end();
                                }
                            }).on('error', function () {
                                console.log(arr[index].link + "    章节出错");
                            })
                        })
                    }, 200 * i)  //避免访问网站的IP防护检测，0.2s访问一次，
                })(i)
                i++;
            } while (i < arr.length)
        }
    }

    http.createServer(onRequest).listen(8686);
    console.log("http://127.0.0.1:8686")
}

start();


