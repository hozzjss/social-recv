
;; social-recovery
;; v1 
;; - store and keep track of people's stx balances
;;   . as a member i should be able to make a deposit to my own account
;;   . as a member i should be able to make a withdrawal from my own account
;;   . as a member i should be able to make an internal transfer to other members
;;   . as a member i should be able to make an external transfer to someone else
;; - enable them to recover each other's balances if they lose their keys
;;   **** CONSENSUS FLOW STYLE ****
;;   . as a member i should be able to mark an account as lost and provide a new owner principal
;;       - this would mark the account as inaccessible for 200 blocks until the recovery request is fulfilled or rejected
;;       - this would also restrict the member who marked the account 
;;         as lost from marking any other account as lost for 2000 blocks
;;       - 200 blocks so that if the account was stolen the thief wouldn't be able to access it
;;       - 2000 blocks so that if a member was acting maliciously 
;;         and wanted to lock everyone out of their account, they wouldn't be able to do so for 2000 blocks
;;         these numbers are open to change
;;   . as a member I should be able to dissent to recovery request so that the request is cancelled
;;   . as a member I should be able to execute the recovery request after a dissent period passes


;; constants
;;

(define-constant MEMBERS 
    (list 
        'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG
        'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC
        'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND
        'ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB))
    


(define-constant CONTRACT (as-contract tx-sender))

;; error codes
;;

(define-constant NOT-MEMBER u1001)
(define-constant NOT-AUTHORIZED u1002)

(define-constant INSUFFICIENT-FUNDS u2001)

(define-constant INVALID-AMOUNT u2002)



;; data maps and vars
;;
(define-map member-balances 
    principal 
    uint)


;; private functions
;;
(define-private (add-member (member principal)) 
    (map-insert member-balances member u0))

(define-private (set-balance (member principal) (amount uint))
    (map-set member-balances member amount))

(define-private (transfer-checks (amount uint) (from principal) (to principal))
    (let (
          (balance (get-balance from))) 
        (asserts! (> amount u0) (err INVALID-AMOUNT))
        (asserts! (is-eq tx-sender from contract-caller) (err NOT-AUTHORIZED))
        (asserts! (is-member tx-sender) (err NOT-MEMBER))
        (asserts! (>= balance amount) (err INSUFFICIENT-FUNDS))
        (ok balance)))
    


;; public functions
;;

(define-public (deposit (amount uint) (to principal))
    (begin
        (asserts! (> (stx-get-balance tx-sender) amount) (err INSUFFICIENT-FUNDS))
        (asserts! (is-member to) (err NOT-MEMBER))
        (asserts! (> amount u0) (err INVALID-AMOUNT))
        (set-balance to (+ (get-balance to) amount))
        (stx-transfer? amount tx-sender CONTRACT)))
    


(define-public (external-transfer (amount uint) (from principal) (to principal) (memo (optional (buff 34))))
    ;; #[filter(amount, from, to)]
    (match (transfer-checks amount from to) 
        from-balance
        (begin 
            (set-balance from (- from-balance amount))
            (match memo to-print (print to-print) 0x)
            (as-contract (stx-transfer? amount tx-sender to)))
        error (err error)))



(define-public (withdraw (amount uint) (member principal))
    (external-transfer amount member member none))


(define-public (internal-transfer (amount uint) (from principal) (to principal) (memo (optional (buff 34))))
    ;; #[filter(amount, from, to)]
    (match (transfer-checks amount from to) 
        from-balance
        (begin    
        (asserts! (and (is-member from) (is-member to)) (err NOT-MEMBER))
        (set-balance from (- from-balance amount))
        (set-balance to (+ (get-balance to) amount))
        (match memo to-print (print to-print) 0x)
        (ok true))
        error (err error)))


(define-read-only (get-balance (member principal)) 
    (default-to u0 (map-get? member-balances member)))

(define-read-only (is-member (account principal)) 
    (is-some (map-get? member-balances account)))

;; init

(map add-member MEMBERS)