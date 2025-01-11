
type Task<T> = (...args: any[]) => Promise<T>;
type Arguments<T> = [T] extends [(...args: infer U) => any] ? U : [T] extends [void] ? [] : [T];

interface ITask<T, C> {
    task: Task<T>;
    args: Arguments<T>,
    priority_obj: C;
    resolve: (value?: T | PromiseLike<T>) => void;
    reject: (reason?: any) => void;
}

/**
 * A simple in memory priority queue
 *
 * @class TaskEasy
 * @param {Function} compare_func - Function to handle comparison objects passed to Scheduler
 * @param {Number} [max_queue_size=100] Max number of tasks allowed in queue
 */
export class TaskEasy<C> {
    private readonly tasks: ITask<any, C>[] = [];
    private taskRunning: boolean = false;
    private compare: (ob1: C, obj2: C) => boolean;
    private readonly max: number;

    constructor(compare_func: (ob1: C, obj2: C) => boolean, private readonly delay: number, max_queue_size = 100) {

        if (typeof compare_func !== "function")
            throw new Error(
                `Task Easy Comparison Function must be of Type "function" instead got ${typeof compare_func}`
            );

        if (typeof max_queue_size !== "number")
            throw new Error(`Task Easy Max Queue Size must be of Type "number" instead got ${typeof max_queue_size}`);

        if (max_queue_size <= 0) throw new Error("Task Easy Max Queue Size must be greater than 0");

        this.compare = compare_func;
        this.max = max_queue_size;
    }

    /**
     * Schedules a new "Task" to be Performed
     *
     * @param {function} task - task to schedule
     * @param {Array} args - array of arguments to pass to task
     * @param {object} priority_obj - object that will be passed to comparison handler provided in the constructor
     * @returns
     * @memberof TaskQueue
     */
    schedule<P, T extends Task<P>>(task: T, args: Arguments<T>, priority_obj: C): Promise<P> {
        if (typeof task !== "function")
            throw new Error(`Scheduler Task must be of Type "function" instead got ${typeof task}`);
        if (!Array.isArray(args)) throw new Error(`Scheduler args must be of Type "Array" instead got ${typeof args}`);
        if (typeof priority_obj !== "object")
            throw new Error(`Scheduler Task must be of Type "Object" instead got ${typeof priority_obj}`);
        if (this.tasks.length >= this.max) throw new Error(`Micro Queue is already full at size of ${this.max}!!!`);

        // return Promise to Caller
        return new Promise((resolve, reject) => {
            // Push Task to Queue
            if (this.tasks.length === 0) {
                this.tasks.unshift({ task, args, priority_obj, resolve, reject });
                this._reorder(0);
                this._next();
            } else {
                this.tasks.unshift({ task, args, priority_obj, resolve, reject });
                this._reorder(0);
            }
        });
    }

    /**
     * Swaps the tasks with the specified indexes
     *
     * @param {number} ix
     * @param {number} iy
     * @memberof TaskEasy
     */
    private _swap(ix: number, iy: number) {
        const temp = this.tasks[ix];
        this.tasks[ix] = this.tasks[iy];
        this.tasks[iy] = temp;
    }

    /**
     * Recursively Reorders from Seed Index Based on Outcome of Comparison Function
     *
     * @param {number} index
     * @memberof TaskQueue
     */
    private _reorder(index: number) {
        const { compare } = this;
        const size = this.tasks.length;

        const l = index * 2 + 1;
        const r = index * 2 + 2;

        let swap = index;

        if (l < size && compare(this.tasks[l].priority_obj, this.tasks[swap].priority_obj)) swap = l;
        if (r < size && compare(this.tasks[r].priority_obj, this.tasks[swap].priority_obj)) swap = r;

        if (swap !== index) {
            this._swap(swap, index);
            this._reorder(swap);
        }
    }

    /**
     * Executes Highest Priority Task
     *
     * @memberof TaskQueue
     */
    private _runTask() {
        this._swap(0, this.tasks.length - 1);

        const job = this.tasks.pop();
        if (!job) return;
        const { task, args, resolve, reject } = job;

        this._reorder(0);

        this.taskRunning = true;

        task(...args)
            .then((...args: any[]) => {
                resolve(...args);
                this.taskRunning = false;
                this._next();
            })
            .catch((...args: any[]) => {
                reject(...args);
                this.taskRunning = false;
                this._next();
            });
    }

    /**
     * Executes Next Task in Queue if One Exists and One is Currently Running
     *
     * @memberof TaskQueue
     */
    private _next() {
        if (this.tasks.length !== 0 && !this.taskRunning) {
            if (this.delay) {
                setTimeout(() => {
                    this._runTask();
                }, this.delay);
            } else this._runTask();
        }
    }
}
