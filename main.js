const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {

    if (!startTime || !endTime) return "0:00:00";

    let [sTimeStr, sPeriod] = startTime.split(" ");
    let [eTimeStr, ePeriod] = endTime.split(" ");

    let [sHour,sMin,sSec] = sTimeStr.split(":").map(Number);
    let [eHour,eMin,eSec] = eTimeStr.split(":").map(Number);

    if(sPeriod.toLowerCase() === "pm" && sHour !== 12) sHour += 12;
    if(sPeriod.toLowerCase() === "am" && sHour === 12) sHour = 0;
    if(ePeriod.toLowerCase() === "pm" && eHour !== 12) eHour += 12;
    if(ePeriod.toLowerCase() === "am" && eHour === 12) eHour = 0;

    let diff = (eHour*3600 + eMin*60 + eSec) - (sHour*3600 + sMin*60 + sSec);
    if(diff < 0) diff += 24*3600;

    let h = Math.floor(diff/3600);
    let m = Math.floor((diff%3600)/60);
    let s = diff%60;

    return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    
     function timeToSeconds(t) {
        if (!t) return 0;
        let [timeStr, period] = t.split(" ");
        let [h,m,s] = timeStr.split(":").map(Number);
        if(period.toLowerCase() === "pm" && h !== 12) h += 12;
        if(period.toLowerCase() === "am" && h === 12) h = 0;
        return h*3600 + m*60 + s;
    }

    let startSec = timeToSeconds(startTime);
    let endSec = timeToSeconds(endTime);

    let idleStart = 8*3600;
    let idleEnd = 22*3600;

    let before = Math.max(0, idleStart - startSec);
    let after = Math.max(0, endSec - idleEnd);

    let totalIdle = before + after;

    let h = Math.floor(totalIdle/3600);
    let m = Math.floor((totalIdle%3600)/60);
    let s = totalIdle%60;

    return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {

    function hmsToSec(hms){ return hms.split(":").map(Number).reduce((a,v,i)=>a+v*(i===0?3600:i===1?60:1),0);}
    let total = hmsToSec(shiftDuration)-hmsToSec(idleTime);
    if(total<0) total=0;
    let h=Math.floor(total/3600), m=Math.floor((total%3600)/60), s=total%60;
    return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    let [h,m,s]=activeTime.split(":").map(Number);
    let seconds=h*3600+m*60+s;

    let d=new Date(date);
    let isEid=(d.getFullYear()===2025 && d.getMonth()===3 && d.getDate()>=10 && d.getDate()<=30); 
    let quotaSec = isEid? 6*3600 : 8*3600 + 24*60;
    return seconds>=quotaSec;

}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {

    let shifts=[];
    if(fs.existsSync(textFile)) shifts=fs.readFileSync(textFile,"utf-8").trim().split("\n");

    let exists = shifts.some((line,i)=>i>0 && line.split(",")[0]===shiftObj.DriverID && line.split(",")[2]===shiftObj.Date);
    if(exists) return {};

    let shiftDuration = getShiftDuration(shiftObj.StartTime, shiftObj.EndTime);
    let idleTime = getIdleTime(shiftObj.StartTime, shiftObj.EndTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quotaMet = metQuota(shiftObj.Date, activeTime);

    let newRecord = {
    driverID: shiftObj.driverID,
    driverName: shiftObj.driverName || "",
    date: shiftObj.date,
    clockIn: shiftObj.clockIn,
    clockOut: shiftObj.clockOut,
    shiftDuration: shiftDuration,
    idleTime: idleTime,
    activeTime: activeTime,
    metQuota: quotaMet,
    hasBonus: false
    };

    let line = Object.values(newRecord).join(",");
    fs.appendFileSync(textFile,"\n"+line);
    return newRecord;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {

    if(!fs.existsSync(textFile)) return false;
    let lines=fs.readFileSync(textFile,"utf-8").trim().split("\n");
    let updated=false;
    for(let i=1;i<lines.length;i++){
        let parts=lines[i].split(",");
        if(parts[0]===driverID && parts[2]===date){
            parts[9]=newValue?"true":"false";
            lines[i]=parts.join(",");
            updated=true;
            break;
        }
    }
    if(updated) fs.writeFileSync(textFile, lines.join("\n"));
    return updated;
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    
    if(!fs.existsSync(textFile)) return -1;
    month = month.toString().padStart(2,"0");
    let lines = fs.readFileSync(textFile,"utf-8").trim().split("\n");
    let count = 0, found = false;
    for(let i=1;i<lines.length;i++){
        let parts = lines[i].split(",");
        if(parts[0] === driverID){
            found = true;
            if(parts[2].split("-")[1] === month && parts[9].toLowerCase() === "true") count++;
        }
    }
    return found ? count : -1;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    
    if(!fs.existsSync(textFile)) return "0:00:00";
    month = month.toString().padStart(2,"0");
    let lines = fs.readFileSync(textFile,"utf-8").trim().split("\n");
    let totalSec = 0;
    function hmsToSec(hms){ return hms.split(":").map(Number).reduce((a,v,i)=>a+v*(i===0?3600:i===1?60:1),0);}
    for(let i=1;i<lines.length;i++){
        let parts = lines[i].split(",");
        if(parts[0] === driverID && parts[2].split("-")[1] === month) totalSec += hmsToSec(parts[7]);
    }
    let h = Math.floor(totalSec/3600), m = Math.floor((totalSec%3600)/60), s = totalSec%60;
    return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    if(!fs.existsSync(rateFile)) return undefined;
    let lines = fs.readFileSync(rateFile,"utf-8").trim().split("\n");
    let baseHours = 0;
    for(let i=1;i<lines.length;i++){
        let parts = lines[i].split(",");
        if(parts[0] === driverID){ 
            baseHours = parseFloat(parts[2]); 
            break;
        }
    }
    let totalHours = baseHours + bonusCount*2;  // each bonus adds 2 hours
    let h = Math.floor(totalHours);
    let m = Math.floor((totalHours - h) * 60);
    return `${h}:${m.toString().padStart(2,"0")}:00`;
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
     if(!fs.existsSync(rateFile)) return undefined;
    let lines = fs.readFileSync(rateFile,"utf-8").trim().split("\n");
    let rate = 0;
    for(let i=1;i<lines.length;i++){
        let parts = lines[i].split(",");
        if(parts[0] === driverID){ 
            rate = parseInt(parts[1]); 
            break;
        }
    }
    function hmsToSec(hms){ let [h,m,s]=hms.split(":").map(Number); return h*3600+m*60+s; }
    let actualSec = hmsToSec(actualHours);
    let requiredSec = hmsToSec(requiredHours);
    let maxPay = Math.floor(requiredSec/3600 * rate);
    let pay = Math.floor(actualSec/3600 * rate);
    if(pay > maxPay) pay = maxPay;
    return pay;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
