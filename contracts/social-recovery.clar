
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
;;       - this would mark the account as inaccessible until the recovery request is fulfilled or rejected
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
        'ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB
    ))


(define-constant CONTRACT (as-contract tx-sender))

;; error codes
;;

(define-constant NOT-MEMBER u1001)
(define-constant NOT-AUTHORIZED u1002)

(define-constant INSUFFICIENT-FUNDS u2001)



;; data maps and vars
;;
(define-map member-balances 
    principal 
    uint)


;; private functions
;;
(define-private (add-member (member principal)) 
    (map-insert member-balances member u0))


;; public functions
;;

(define-public (deposit (amount uint) (to principal))
    (let 
        (
            (balance 
                (begin
                    (asserts! (is-member to) (err NOT-MEMBER))
                    (get-balance to)))
            (new-balance (begin 
                (asserts! (> (stx-get-balance tx-sender) amount) (err INSUFFICIENT-FUNDS))
                (+ balance amount)))
        )
        (map-set member-balances to new-balance)
        (stx-transfer? amount tx-sender CONTRACT)
    )
)

(define-public (external-transfer (amount uint) (from principal) (to principal) (memo (optional (buff 34))))
    (begin 
        (asserts! (is-member tx-sender) (err NOT-MEMBER))
        (asserts! (is-eq tx-sender from contract-caller) (err NOT-AUTHORIZED))
        (let (
            (balance (get-balance from))
            (new-balance 
                (- balance amount))
        )
            (asserts! (>= balance amount) (err INSUFFICIENT-FUNDS))
            (map-set member-balances from new-balance)
            (match memo to-print (print to-print) 0x)
            (as-contract (stx-transfer? amount tx-sender to))
        )
    )
)


(define-public (withdraw (amount uint) (member principal)) 
    (external-transfer amount member member none)
)

(define-public (internal-transfer (amount uint) (from principal) (to principal) (memo (optional (buff 34))))
    (begin 
        (asserts! (is-eq tx-sender from contract-caller) (err NOT-AUTHORIZED))
        (asserts! (is-member from) (err NOT-MEMBER))
        (asserts! (is-member to) (err NOT-MEMBER))
        (let (
            (from-balance (get-balance from))
            (from-new-balance 
                (- from-balance amount))

            (to-balance (get-balance to))
            (to-new-balance 
                (+ to-balance amount))
        )
            (asserts! (>= from-balance amount) (err INSUFFICIENT-FUNDS))
            (map-set member-balances from from-new-balance)
            (map-set member-balances to to-new-balance)
            (match memo to-print (print to-print) 0x)
            (ok true)
        )
    )
)


(define-read-only (get-balance (member principal)) 
    (default-to u0 (map-get? member-balances member)))

(define-read-only (is-member (account principal)) 
    (is-some (map-get? member-balances account)))

;; init

(map add-member MEMBERS)