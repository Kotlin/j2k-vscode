@Entity
@Table(name = "visits")
class Visit : BaseEntity() {

    @field:DateTimeFormat(pattern = "yyyy-MM-dd")
    @Column(name = "visit_date")
    private var date: LocalDate? by Delegates.notNull()

    init {
        this.date = LocalDate.now()
    }

    @NotBlank
    internal var description: String? = null

}