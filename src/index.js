import { type } from '@jsmini/type';

// Object.create(null) 的对象，没有hasOwnProperty方法
function hasOwnProp(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

// 仅对对象和数组进行深拷贝，其他类型，直接返回
function isClone(x) {
    const t = type(x);
    return t === 'object' || t === 'array';
}

// 递归
export function clone(x) {
    if (!isClone(x)) return x;

    const t = type(x);

    let res;

    if (t === 'array') {
        res = [];
        for (let i = 0; i < x.length; i++) {
            // 避免一层死循环 a.b = a
            res[i] = x[i] === x ? res: clone(x[i]);
        }
    } else if (t === 'object') {
        res = {};
        for(let key in x) {
            if (hasOwnProp(x, key)) {
                // 避免一层死循环 a.b = a
                res[key] = x[key] === x ? res : clone(x[key]);
            }
        }
    }

    return res;
}

// 通过JSON深拷贝
export function cloneJSON(x, errOrDef = true) {
    if (!isClone(x)) return x;

    try {
        return JSON.parse(JSON.stringify(x));
    } catch(e) {
        if (errOrDef === true) {
            throw e;
        } else {
            console.error('cloneJSON error: ' + e.message);
            return errOrDef;
        }
    }
}

// 循环
export function cloneLoop(x) {
    const t = type(x);

    let root = x;

    if (t === 'array') {
        root = [];
    } else if (t === 'object') {
        root = {};
    }

    // 循环数组
    const loopList = [
        {
            parent: root,
            key: undefined,
            data: x,
        }
    ];

    while(loopList.length) {
        // 深度优先
        const node = loopList.pop();
        const parent = node.parent;
        const key = node.key;
        const data = node.data;
        const tt = type(data);

        // 初始化赋值目标，key为undefined则拷贝到父元素，否则拷贝到子元素
        let res = parent;
        if (typeof key !== 'undefined') {
            res = parent[key] = tt === 'array' ? [] : {};
        }

        if (tt === 'array') {
            for (let i = 0; i < data.length; i++) {
                // 避免一层死循环 a.b = a
                if (data[i] === data) {
                    res[i] = res;
                } else if (isClone(data[i])) {
                    // 下一次循环
                    loopList.push({
                        parent: res,
                        key: i,
                        data: data[i],
                    });
                } else {
                    res[i] = data[i];
                }
            }
        } else if (tt === 'object'){
            for(let k in data) {
                if (hasOwnProp(data, k)) {
                    // 避免一层死循环 a.b = a
                    if (data[k] === data) {
                        res[k] = res;
                    } else if (isClone(data[k])) {
                        // 下一次循环
                        loopList.push({
                            parent: res,
                            key: k,
                            data: data[k],
                        });
                    } else {
                        res[k] = data[k];
                    }
                }
            }
        }
    }

    return root;
}

// 保持引用关系
const UNIQUE_KEY = 'com.yanhaijing.' + (new Date).getTime();

// 创建数据
function createData() {
    return [];
}
// 将数据加入暂存区
function setData(data, source, target) {
    const index = data.length;
    data[index] = { source, target };
    source[UNIQUE_KEY] = index;
}
// 查找缓存
function findData(data, source) {
    const index = source[UNIQUE_KEY];

    if (typeof index === 'number') {
        return data[index].target;
    }

    return false;
}
// 清除缓存
function clearData(data) {
    for (let i = 0; i < data.length; i++) {
        delete data[i].source[UNIQUE_KEY];
    }
    data.length = 0;
}
export function cloneForce(x) {
    const uniqueData = createData();
    const t = type(x);

    let root = x;

    if (t === 'array') {
        root = [];
    } else if (t === 'object') {
        root = {};
    }

    // 循环数组
    const loopList = [
        {
            parent: root,
            key: undefined,
            data: x,
        }
    ];

    while(loopList.length) {
        // 深度优先
        const node = loopList.pop();
        const parent = node.parent;
        const key = node.key;
        const source = node.data;
        const tt = type(source);

        // 初始化赋值目标，key为undefined则拷贝到父元素，否则拷贝到子元素
        let target = parent;
        if (typeof key !== 'undefined') {
            target = parent[key] = tt === 'array' ? [] : {};
        }

        // 复杂数据需要缓存操作
        if (isClone(source)) {
            // 命中缓存，直接返回缓存数据
            let uniqueTarget = findData(uniqueData, source);
            if (uniqueTarget) {
                parent[key] = uniqueTarget;
                continue; // 中断本次循环
            }

            // 未命中缓存，保存到缓存
            setData(uniqueData, source, target);
        }

        if (tt === 'array') {
            for (let i = 0; i < source.length; i++) {
                if (isClone(source[i])) {
                    // 下一次循环
                    loopList.push({
                        parent: target,
                        key: i,
                        data: source[i],
                    });
                } else {
                    target[i] = source[i];
                }
            }
        } else if (tt === 'object'){
            for(let k in source) {
                if (hasOwnProp(source, k)) {
                    if (k == UNIQUE_KEY) continue;
                    if (isClone(source[k])) {
                        // 下一次循环
                        loopList.push({
                            parent: target,
                            key: k,
                            data: source[k],
                        });
                    } else {
                        target[k] = source[k];
                    }
                }
            }
        }
    }
    
    clearData(uniqueData);

    return root;
}
