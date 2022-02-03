//Data base variable to work with
var db;
openDB();
//Fetch Logged In
fetchLogged(0);
//Check admin log
checkUser();
// Login function
function login(){
    fetchAccount(document.getElementById('user').value,document.getElementById('pass').value);
    setTimeout(function(){
        if(fetchUser.rows.length){
            animateScreen(1,fetchUser.rows['0']['userName']);
            checkUser();
        }
        else{
            animateScreen(0);
        }
    },30);
}

//Open Database
function openDB(){
    db = openDatabase("PharmacyInventory","1.1","Store Items",50*1024*1024);
    createTable();
}

//Check for tables existence or creates them
function createTable(){
    db.transaction(function(ts){
        ts.executeSql("create table if not exists item (id int primary key, name varchar(200), qty int, picEnc varchar(30000))",null,function(ts,result){
            ts.executeSql("create table if not exists invoice (id int primary key, cstName varchar(200), invDate date, typeOfTrans varchar(4))",null,function(ts,result){
                ts.executeSql("create table if not exists user (id int primary key, userName varchar(50), passWord varchar(50), admin int, logged int)",null,function(ts,result){
                    ts.executeSql("create table if not exists purchase (invoiceId int, itemId int, itemQty int, PRIMARY KEY(invoiceId, itemId))",null)
                });
            });
        });
    })
}

//Fetch Tuples
var x = {};
function fetchContent(obj,contentName){
    db.transaction(function(ts){
        ts.executeSql(`select * from ${contentName}`,null,function(ts,result){  
            obj['rows'] = result['rows'];
        })
    })
}
//Fetch UserName
var fetchUser;
function fetchAccount(user,pass){
    db.transaction(function(ts){
        ts.executeSql(`select * from user where userName = '${user}' and passWord = '${pass}'`,null,function(ts,result){
            if (result.rows.length){
                ts.executeSql(`update user set logged = 1 where id = '${result.rows['0']['id']}'`);
            }
            fetchUser = result;
        })
    })
}

//Fetch Logged in (flag to log in if user already logged in from previous session or log out on command)
function fetchLogged(flag){
    db.transaction(function(ts){
        if(!flag){
            ts.executeSql(`select * from user where logged = 1`,null,function(ts,result){
                if(result.rows.length){
                    animateScreen(1,result.rows['0']['userName']);
                }
            })
        }
        else{
            ts.executeSql(`update user set logged = 0 where logged = 1`,null,function(ts,result){
                location.reload();
            })
        }
        //Checks for admin account existence
        ts.executeSql(`select * from user where userName='admin'`,null,function(ts,result){
            if(result.rows.length == 0){
                createUser('admin', 'admin', 1);
            }
        })
    })
}

//Creates account for new user
function createUser(userName,userPassword,adminFlag){
    var admin = 0;
    if(adminFlag){
        admin = 1;
    }
    db.transaction(function(ts){
        ts.executeSql(`select max(id) as maxId from user`,null,function(ts,result){
            if(result.rows.length){
                var newId = result.rows[0]['maxId']+1;
                ts.executeSql(`insert into user (id, userName, passWord, admin, logged) values(${newId}, '${userName}', '${userPassword}', ${admin}, 0)`);
            }
        })
    });
}

//Checks if user is admin
var adminFlagCheck;
function checkUser(){
    adminFlagCheck = 0;
    db.transaction(function(ts){
        ts.executeSql(`select * from user where logged = 1 and admin=1`,null,function(ts,result){
            if(result.rows.length){
                adminFlagCheck = 1;
                document.getElementsByClassName('admin')[0].style.visibility = "visible";
                document.getElementsByClassName('admin')[1].style.visibility = "visible";
            }
        })
    })
}

//Add new User 
function addUser(){
    var username = document.getElementsByClassName('input3')[0].value;
    var password = document.getElementsByClassName('input3')[1].value;
    if(username && password){
        db.transaction(function(ts){
            ts.executeSql(`select * from user where userName = '${username}'`,null,function(ts,result){
                if (!result.rows.length){
                    createUser(username, password, 0);
                    outComeAnimation(2);
                }
                else{
                    outComeAnimation(3);
                }
            },function(ts,error){console.log(error);})
        })
    }
}

//Editing Quantities
function contentTrans(flag){
    var operation;
    var checkFlag = 1;
    var items = {};
    var invoices = {};
    var purchases = {};
    var qtyForm = document.getElementsByClassName('innerInput');
    var partyName = document.getElementById('input2').value;
    var arrayTrans = [];
    fetchContent(items,'item');
    fetchContent(invoices,'invoice');
    fetchContent(purchases,'purchase');
    if(qtyForm.length,partyName){
        setTimeout(function(){
            for(var i=0; i<qtyForm.length;i++){
                if(qtyForm[i].value){
                    var tempObj = {id:i+1,val:parseInt(qtyForm[i].value)}
                    arrayTrans.push(tempObj);
                }
            }
            if(!flag){
                operation = '+';
            }
            else{
                operation = '-';
                for(var i=0;i<arrayTrans.length;i++){
                    var itemId = arrayTrans[i]['id']-1;
                    var qtyItem = parseInt(items.rows[itemId]['qty']);
                    var qtyArr = arrayTrans[i]['val'];
                    if(qtyArr>qtyItem){
                        checkFlag = 0;
                    }
                }
            }
            if(checkFlag){
                var transType;
                if(operation == '+'){
                    transType = 'Buy';
                }else{
                    transType = 'Sell';
                }
                db.transaction(function(ts){
                    ts.executeSql(`select max(id) as maxId from invoice`,null,function(ts,result){
                        if(result.rows.length){
                            var newDate = new Date().toLocaleDateString("en-US");
                            var newId = result.rows[0]['maxId']+1;
                            ts.executeSql(`insert into invoice (id, cstName, invDate, typeOfTrans) values(${newId}, '${partyName}', '${newDate}', '${transType}')`
                            ,null,function(ts,result){},function(ts,error){console.log(error);});
                            for(var i=0;i<arrayTrans.length;i++){
                                ts.executeSql(`update item set qty = qty${operation}${arrayTrans[i]['val']} where id=${arrayTrans[i]['id']}`);
                                ts.executeSql(`insert into purchase (invoiceId, itemId, itemQty) values(${newId}, ${arrayTrans[i]['id']}, ${arrayTrans[i]['val']})`);
                            }
                        }
                    });
                })
                outComeAnimation(0);
            } 
            else{
                outComeAnimation(1);
            }
        },35);
    }
}

//Show Tables
function showTable(flag){
    //Closing camera
    stop();
    //Removing previous elements from head
    var tableHead = document.getElementById('headContent');
    var authEl = document.getElementById('auth');
    var trans = document.getElementById('trans');
    trans.style.display = 'none';
    tableHead.innerHTML="";
    var fetchResults = {};
    //flag decides which table to show
    if(flag==1){
        //Content Names Array
        var contentArray = ["ID","Name","Qty","Picture"];
        //Setting message
        authEl.innerHTML = "ITEMS";
        //Fetching tuples
        fetchContent(fetchResults,'item');
    }
    else if(flag == 2){
        //Content Names Array
        var contentArray = ["ID","Name","Qty","Trans Qty"];
        //Setting message
        authEl.innerHTML = "ITEMS TRANSACTION";
        //Fetching tuples
        fetchContent(fetchResults,'item');
    }
    else if(!flag){
        var purchases = {};
        var items = {};
        //Setting message
        authEl.innerHTML = "INVOICES";
        //Content Names Array
        var contentArray = ["Invoice ID","Customer Name","Date","Transaction"];
        var contentArrayTwo = ["Item Name","Item Quantity"];
        //Fetching tuples
        fetchContent(fetchResults,'invoice');
        fetchContent(purchases,'purchase');
        fetchContent(items,'item');
    }
    //Removing Tables and title message for animation to take place
    document.getElementById('tableShow').style.display="none";
    document.getElementById('auth').style.display="none";
    //Setting Table Content (Making it async in order to wait for database tuple fetch async function)
    setTimeout(function(){
        //Setting Table Head Items
        var tableBanner = document.getElementById('tableBanner');
        tableBanner.innerHTML = "";
        for(var i=0;i<contentArray.length;i++){
            var newTableHead = document.createElement('th');
            newTableHead.innerHTML=contentArray[i];
            // i < contentArray.length-1 ? newTableHead.style.borderRight = '2px solid black' : 0;
            tableBanner.appendChild(newTableHead);
        }
        //Setting Table Tuples
        var tableBody = document.getElementById('tableBody');
        tableBody.innerHTML = "";
        var count =0;
        //Items
        if(flag==1){
            for(var i=0;i<fetchResults.rows.length;i++){
                var newDataRow = document.createElement('tr');
                (++count % 2) ? 0 : newDataRow.style.backgroundColor = 'rgb(238, 238, 238)';
                for(var j in fetchResults.rows[`${i}`]){
                    var newData = document.createElement('td');
                    if(j!='picEnc'){
                        newData.innerHTML = fetchResults.rows[`${i}`][j];
                    }
                    else{
                        newData.innerHTML = "+";
                        newData.className = "showImage";
                        newData.onmouseenter = showPic;
                        newData.onmouseleave = closePic;
                        newData.code = fetchResults.rows[`${i}`][j];
                    }
                    newDataRow.appendChild(newData);
                }
                tableBody.appendChild(newDataRow);
            }
        }
        //Transaction
        else if (flag==2){
            document.getElementById('input2').value = "";
            for(var i=0;i<fetchResults.rows.length;i++){
                var newDataRow = document.createElement('tr');
                (++count % 2) ? 0 : newDataRow.style.backgroundColor = 'rgb(238, 238, 238)';
                for(var j in fetchResults.rows[`${i}`]){
                    if(j!='picEnc'){
                        var newData = document.createElement('td');
                        newData.innerHTML = fetchResults.rows[`${i}`][j];
                        newDataRow.append(newData);
                    }
                }
                var newData = document.createElement('input');
                newData.className = 'innerInput';
                newData.type = 'number';
                (count % 2) ? 0 : newData.style.borderBottom = '2px solid white';
                newData.placeholder = '...';
                newDataRow.append(newData);
                tableBody.append(newDataRow);
            }
        }
        //Invoices
        else if(!flag){
            for(var i=0;i<fetchResults.rows.length;i++){
                var newDataRow = document.createElement('tr');
                newDataRow.style.backgroundColor = '#cecfd1';
                for(var j in fetchResults.rows[`${i}`]){
                    var newData = document.createElement('td');
                    newData.innerHTML = fetchResults.rows[`${i}`][j];
                    newDataRow.append(newData);
                }
                tableBody.append(newDataRow);
                var newDataRow = document.createElement('tr');
                newDataRow.className = "subCat";
                var newData = document.createElement('td');
                newData.innerHTML = "Item Name:";
                newDataRow.append(newData);
                var newData = document.createElement('td');
                newData.innerHTML = "Quantity:";
                newDataRow.append(newData);
                tableBody.append(newDataRow);

                for(var j=0; j<purchases.rows.length;j++){
                    if(purchases.rows[`${j}`]['invoiceId']==fetchResults.rows[`${i}`]['id']){
                        var newDataRow = document.createElement('tr');
                        newDataRow.className = "itemBorder";
                        var newData = document.createElement('td');
                        var itemId = purchases.rows[`${j}`][`itemId`]-1;
                        newData.innerHTML = items.rows[`${itemId}`]['name'];
                        newDataRow.append(newData);
                        var newData = document.createElement('td');
                        newData.innerHTML = purchases.rows[`${j}`]['itemQty'];
                        newDataRow.append(newData);
                        tableBody.append(newDataRow);
                    }
                }
            }
        }    
        setTimeout(function(){
            if(flag!=2){
                opacityAnimation(0);
            }
            else{
                opacityAnimation(1);
            }
        },250);
    },25);
}

//Admin Panel
function addUserPanel(){
    stop();
    checkUser();
    setTimeout(function(){
        if(adminFlagCheck){
            var tableBanner = document.getElementById('tableBanner');
            var tableBody = document.getElementById('tableShow');
            var authEl = document.getElementById('auth');
            var tableBody2 = document.getElementById('tableBody');
            tableBody2.innerHTML = "";
            var input = document.createElement('input');
            input.placeholder = 'New Username';
            input.className = "input3";
            input.type = 'text';
            tableBody2.appendChild(input);
            var input = document.createElement('input');
            input.className = "input3";
            input.placeholder = 'New Password';
            input.type = 'password';
            tableBody2.appendChild(input);
            authEl.innerHTML = "USERS";
            var btn = document.createElement('button');
            btn.id = 'input3Butt';
            btn.style.height = "30px";
            btn.innerHTML = "Add";
            btn.onclick = addUser;
            tableBody2.appendChild(btn);
            tableBanner.innerHTML = "Add New User";
            tableBody.style.display = "flex";
            opacityAnimation(0);
        }
    },250);
}

//Admin Panel
function addItemPanel(){
    stop();
    setTimeout(function(){
            var tableBanner = document.getElementById('tableBanner');
            var tableBody = document.getElementById('tableShow');
            var authEl = document.getElementById('auth');
            var tableBody2 = document.getElementById('tableBody');
            tableBody2.innerHTML = "";
            var input = document.createElement('input');
            input.placeholder = 'Item Name';
            input.className = "input4";
            input.type = 'text';
            tableBody2.appendChild(input);
            var input = document.createElement('input');
            input.className = "input4";
            input.placeholder = 'Current Quantity';
            input.type = 'number';
            tableBody2.appendChild(input);
            authEl.innerHTML = "NEW ITEM";
            var camera = document.createElement('video');
            camera.id = 'camera';
            camera.autoplay = 'true';
            tableBody2.appendChild(camera);
            var btn = document.createElement('button');
            btn.id = 'input4Butt';
            btn.style.height = "30px";
            btn.innerHTML = "Add";
            btn.onclick = savePic;
            tableBody2.appendChild(btn);
            tableBanner.innerHTML = "Add New Item";
            tableBody.style.display = "flex";
            opacityAnimation(0);
            startCamera();
    },250);
}

//Animation Interval vars
var colorInterval; //Color interval function
var navInterval; //Navbar interval function
var opacInterval; //Opacity interval function
var authInterval; //Authentication interval function
var authTime; //Authentication timeout function
var checkingFlag = 0; //Authentication flag

//Color Animation
function colorAnimation(flag,times){
    if(times){
        //Check to hault interval
        var check = 0;
        //Using flag to set value and operation
        var val = (flag ? 255 : 0);
        var footerVal = (val ? 0 : 255);
        //Changing footer text color
        document.getElementById('footer').style.color = `rgb(${footerVal},${footerVal},${footerVal})`;
        //Interval Function
        colorInterval = setInterval(function(){
            //Getting both gradients to manipulate the animation
            var gradientOne = getComputedStyle(document.body).backgroundImage.split('rgb')[1].split('), ')[0].substring(1).split(',');
            var gradientTwo = getComputedStyle(document.body).backgroundImage.split('rgb')[2].substring(1).split(')')[0].split(', ');
            //For looping to operate on gradients
            for(var i=0;i<2;i++){
                var currentGradient;
                currentGradient =(i ? gradientTwo : gradientOne);
                for(var j=0;j<3;j++){
                    if(flag){
                        if(currentGradient[j]!=val){
                            currentGradient[j]++;
                        }
                    }
                    else{
                        if(currentGradient[j]!=val){
                            currentGradient[j]--;
                        }
                    }
                }
            }
            //Setting gradient values
            document.body.style.backgroundImage =
            `linear-gradient(rgb(${gradientOne[0]}, ${gradientOne[1]}, ${gradientOne[2]}),
            rgb(${gradientTwo[0]}, ${gradientTwo[1]}, ${gradientTwo[2]}))`;
            //Confirming end results after each to step to hault interval at specific value
            for(var i=0;i<3;i++){
                (gradientOne[i]==val)&&(gradientTwo[i]==val)?++check:check=0;
            }
            if(check>=6){
                clearInterval(colorInterval);
                colorAnimation(!flag,--times);
            }
        },5);    
    }
}

//NavBar Animation
function navAnimation(){
    var navBar = document.getElementById('navBar');
    navBar.style.left ? 0 : navBar.style.left = getComputedStyle(navBar).left;
    navInterval = setInterval(function(){
        if(getComputedStyle(navBar).left.split('px')[0] < 0 ){
            navBar.style.left = parseInt(navBar.style.left.split('px')[0])+10+'px';
        }
        else{
            clearInterval(navInterval);
        }
    },15);
}

//Authentication Animation
function authAnimation(flag,acc){
    var authEl = document.getElementById('auth');
    authEl.style.display="block";
    if(!checkingFlag){
        checkingFlag = 1;
        authInterval = setInterval(function(){
            authEl.style.top ? 0 : authEl.style.top = '50vh';
            if((authEl.style.top).split('vh')[0] > parseInt(screen.height*0.018)){
                authEl.style.top = parseFloat((authEl.style.top).split('vh')[0])-1+'vh';
            }else{
                clearInterval(authInterval);
                authTime = setTimeout(function(){
                    if(flag){
                        authEl.style.top = '25vh';
                        authEl.style.display = 'none';
                    }
                    clearTimeout(authTime);
                },1000);
            }
        },0.025);
    }
    if(flag){
        authEl.style.backgroundColor = "rgb(99, 169, 255)";
        authEl.innerHTML = `Welcome ${acc}!`
        authTime = setTimeout(function(){
            authEl.style.top = '25vh';
            authEl.style.display = 'none';
            clearTimeout(authTime);
        },3000);
    }
    else{
        authEl.style.backgroundColor = "rgb(240, 47, 47)";
        authEl.innerHTML = "Credentials are invalid!"
    }
}

//Table Opacity Animation
function opacityAnimation(flag){ //Flag to show transaction button
    var tableContent = document.getElementById('tableShow');
    var authEl = document.getElementById('auth');
    var trans = document.getElementById('trans');
    tableContent.style.opacity="0%";
    authEl.style.opacity="0%";
    trans.style.opacity="0%";
    tableContent.style.display = "flex";
    authEl.style.display = "block";
    trans.style.display = "flex";
    authEl.style.top = (screen.height*0.10)+"px";
    authEl.style.backgroundImage = "linear-gradient(#586f8d,#41526b)";
    authInterval = setInterval(function(){
        if(parseFloat(tableContent.style.opacity)!='1'){
            tableContent.style.opacity = (parseFloat(tableContent.style.opacity)+0.1).toString(); 
            authEl.style.opacity = (parseFloat(authEl.style.opacity)+0.1).toString(); 
            if(flag){
                trans.style.opacity = (parseFloat(trans.style.opacity)+0.1).toString(); 
            }
        }
        else{
            clearInterval(authInterval);
        }
    },20);
}

//Animate screen upon authentication
function animateScreen(flag,acc){
    //Animate Authentication
    if(flag){
        //Hide Login page
        document.getElementById('loginContainer').style.display="none";
        //Show Log Out
        document.getElementById('logout').style.visibility="visible";
        //Color animation
        colorAnimation(0,2);
        //NavBar Animation
        navAnimation(0);
        //Authentication Animation Success
        authAnimation(1,acc);    
    }
    else{
        //Authentication Animation Fail
        authAnimation(0);    
    }
}

//Animate Success or Failure for Transaction
function outComeAnimation(flag){
    var tableContent = document.getElementById('tableShow');
    var message = document.getElementById('auth');
    message.style.display = 'block';
    var trans = document.getElementById('trans');
    tableContent.style.display = trans.style.display = 'none';
    message.style.backgroundImage = "none";
    message.style.opacity = "0";
    if(!flag){
        message.innerHTML = "Transaction successful!";
        message.style.backgroundColor = "rgb(99, 169, 255)";
    }
    else if(flag==1){
        message.style.backgroundColor = "rgb(240, 47, 47)";
        message.innerHTML = "Transaction Failed!";
    }
    else if(flag == 2){
        message.innerHTML = "User Addition successful!";
        message.style.backgroundColor = "rgb(99, 169, 255)";
    }
    else if(flag == 3){
        message.style.backgroundColor = "rgb(240, 47, 47)";
        message.innerHTML = "User Addition Failed!";
    }
    else if(flag == 4){
        message.innerHTML = "Item Addition successful!";
        message.style.backgroundColor = "rgb(99, 169, 255)";
    }
    else{
        message.style.backgroundColor = "rgb(240, 47, 47)";
        message.innerHTML = "Item Addition Failed!";
    }
    authInterval = setInterval(function(){
        if(parseFloat(message.style.opacity)!='1'){
            message.style.opacity = (parseFloat(message.style.opacity)+0.1).toString(); 
        }
        else{
            clearInterval(authInterval);
        }
    },100);
}

//Camera function
async function startCamera(){
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        let stream = await navigator.mediaDevices.getUserMedia({ video: true, audio:false },)
        document.getElementById('camera').srcObject = stream;
    }
}

//Stop Camera
function stop() {
    try{
        var video = document.getElementById('camera');
        var stream = video.srcObject;
        var tracks = stream.getTracks();
        
        for (var i = 0; i < tracks.length; i++) {
          var track = tracks[i];
          track.stop();
        }
    
        video.srcObject = null;
    }
    catch{

    }
}

//Encode Picture
function savePic(){
    var canvas = document.getElementById('canvas');
    var video = document.getElementById('camera');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    var ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    var imgAsStr = canvas.toDataURL("image/webp");
    var itemname = document.getElementsByClassName('input4')[0].value;
    var itemqty = document.getElementsByClassName('input4')[1].value;
    addItem(itemname, itemqty, imgAsStr);
}


//Decode Picture

//Add Item
function addItem(name, qty, image){
    if(name&&image){
        db.transaction(function(ts){
            ts.executeSql(`select * from item where name = '${name}'`,null,function(ts,result){
                if(!result.rows.length){
                    ts.executeSql(`select max(id) from item as maxId`,null,function(ts,result){
                        var newId = result.rows[0]['max(id)']+1;
                        ts.executeSql(`insert into item values (${newId}, '${name}', ${qty}, '${image}')`,null,function(ts,result){},function(ts,error){console.log(error);});
                    })
                    outComeAnimation(4);
                }
                else{
                    outComeAnimation(5);
                }
                stop();
            })
        })
    }
}

function getOffset( el ) {
    var _x = 0;
    var _y = 0;
    while( el && !isNaN( el.offsetLeft ) && !isNaN( el.offsetTop ) ) {
        _x += el.offsetLeft - el.scrollLeft;
        _y += el.offsetTop - el.scrollTop;
        el = el.offsetParent;
    }
    return { top: _y, left: _x };
}

//Show hovering Image
function showPic(){
    var x;
    var y;
    document.addEventListener('mousemove', (event) => {
        x = event.clientX;
        y = event.clientY;
    });
    var image = document.getElementById('hoverImage');
    image.src = this.code;
    image.style.display = "block";
    setTimeout(function(){
        image.style.left = x+'px';
        image.style.top = y+'px';
    },35);
   
}

//close hovering image
function closePic(){
    var image = document.getElementById('hoverImage');
    image.style.display = "none";   
}