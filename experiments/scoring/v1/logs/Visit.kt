@Entity
@Table(name = "visits")
open class Visit : BaseEntity() {

    @Column(name = "visit_date")
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    private var date: LocalDate? = null

    init {
        this.date = LocalDate.now()
    }

    fun getDate(): LocalDate? = date
    fun setDate(date: LocalDate) { this.date = date }

    @NotBlank
    private var description: String? = null

}