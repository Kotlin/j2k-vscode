@Entity
@Table(name = "vets")
open class Vet : Person() {

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "vet_specialties",
        joinColumns = [JoinColumn(name = "vet_id")],
        inverseJoinColumns = [JoinColumn(name = "specialty_id")]
    )
    private lateinit var specialties: Set<Specialty>

    protected fun getSpecialtiesInternal(): Set<Specialty> {
        if (this.specialties == null) {
            this.specialties = HashSet()
        }
        return this.specialties
    }

    @XmlElement
    override fun getSpecialties(): List<Specialty> {
        val internalSet = getSpecialtiesInternal()
        return internalSet.sortedBy { it.name }.toList()
    }

    override fun getNrOfSpecialties(): Int {
        return getSpecialties().size
    }

    fun addSpecialty(specialty: Specialty) {
        getSpecialtiesInternal().also { set ->
            if (!set.contains(specialty)) {
                set.add(specialty)
            }
        }
    }

}