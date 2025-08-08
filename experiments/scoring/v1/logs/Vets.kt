@XmlRootElement
class Vets {
    private var vets: List<Vet>? = null

    @XmlElement
    fun getVetList(): List<Vet> {
        if (vets == null) {
            vets = ArrayList()
        }
        return vets!!
    }

}